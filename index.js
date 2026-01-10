const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tye2x.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const userCollection = client.db("xyzDB").collection("users");
    const assetCollection = client.db("xyzDB").collection("assets");
    const requestCollection = client.db("xyzDB").collection("requests");


    // JWT related API
    app.post('/jwt', async (req, res) => {
      const { email } = req.body;
      const token = jwt.sign(
        { email: email.toLowerCase().trim() }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '7d'
      })
      res.send({ token })
    })

    // middleware
    const verifyToken = (req, res, next) => {
      console.log('inside verify token', req.headers.authorization)
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'forbidden access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
          return res.status(401).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
      })
    }

    // use verifyHR after verifyToken
    const verifyHR = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const userData = user?.role === 'hr';
      if (!userData) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next();
    }


    // Users Related APIs--->

    // create user
    app.post('/users', async (req, res) => {
      const user = req.body;

      user.email = user.email.toLowerCase().trim();

      const existingUser = await userCollection.findOne({ email: user.email });

      if (existingUser) {
        return res.send({ message: "User already exists" });
      }

      const result = await userCollection.insertOne(user);
      res.send(result);
    });


    // Profile page GET API for HR and employees
    app.get('/users/profile', verifyToken, async (req, res) => {
      const email = req.decoded.email.toLowerCase().trim();
      const user = await userCollection.findOne({ email });

      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }

      res.send(user);
    });





    // Get all users
    app.get('/users', verifyToken, verifyHR, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // get user by email
    app.get('/users/:email', async (req, res) => {
      const email = req.params.email.toLowerCase().trim();

      const query = { email };
      const user = await userCollection.findOne(query);

      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }

      res.send(user);
    });

    // Assets related API--->

    // create assets
    app.post('/assets', verifyToken, verifyHR, async (req, res) => {
      const asset = req.body;
      const result = await assetCollection.insertOne(asset);
      res.send(result);
    });

    // Get all assets with search, filter and sort (HR only)
    app.get('/assets', verifyToken, verifyHR, async (req, res) => {

      const { search, status, type, sort } = req.query;

      let query = {};

      // search by name
      if (search) {
        query.name = {
          $regex: search,
          $options: 'i'
        };
      }
      // filter by availability
      if (status) {
        query.availability = status;
      }

      // filter by asset type
      if (type) {
        query.type = type;
      }

      let cursor = assetCollection.find(query);

      // sort by quantity
      if (sort === 'asc') {
        cursor = cursor.sort({ quantity: 1 });
      }
      if (sort === 'dsc') {
        cursor = cursor.sort({ quantity: -1 });
      }

      const result = await cursor.toArray();
      res.send(result);
    });

    // Get limited stock assets (quantity < 10)
    app.get('/assets/limited-stock', verifyToken, verifyHR, async (req, res) => {
      const query = { quantity: { $lt: 10 } }
      const result = await assetCollection.find(query).sort({ quantity: 1 }).toArray();
      res.send(result);
    });

    // Read asset item by specific id
    app.get('/assets/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await assetCollection.findOne(query);
      res.send(result);
    })



    // Update asset
    app.patch('/assets/:id', verifyToken, verifyHR, async (req, res) => {
      const asset = req.body;
      console.log(req.body)
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };

      const updatedDoc = {
        $set: {
          name: asset.name,
          type: asset.type,
          quantity: asset.quantity,
          availability: asset.quantity > 0 ? "available" : "out of stock"
        }
      };
      const result = await assetCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });



    // Delete a asset item from asset collection
    app.delete('/assets/:id', verifyToken, verifyHR, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await assetCollection.deleteOne(query);
      res.send(result);
    })


    // Employee: get assets with search & filter
    app.get('/employee/assets', verifyToken, async (req, res) => {
      const { search, status, type } = req.query;

      let query = {};

      if (search) {
        query.name = { $regex: search, $options: 'i' };
      }

      if (status) {
        query.availability = status;
      }

      if (type) {
        query.type = type;
      }

      const result = await assetCollection.find(query).toArray();
      res.send(result);
    });


    // Create asset request (Employee)
    app.post('/requests', verifyToken, async (req, res) => {
      const request = req.body;
      const newRequest = {
        assetId: request.assetId,
        assetName: request.assetName,
        type: request.type,
        employeeName: request.employeeName,
        employeeEmail: request.employeeEmail,
        note: request.note || "",
        status: "pending",
        createdAt: new Date()
      };
      const result = await requestCollection.insertOne(newRequest);
      res.send(result);
    })

    // GET /hr/pending-requests
    app.get('/hr/pending-requests', verifyToken, verifyHR, async (req, res) => {
      const query = { status: 'pending' };

      const result = await requestCollection
        .find(query)
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray()

      res.send(result);
    })

    // HR top most requested assets using aggregate (max: 4)
    app.get('/hr/top-requested-assets', verifyToken, verifyHR, async (req, res) => {
      const result = await requestCollection.aggregate([
        {
          $group: {
            _id: "$assetId",
            assetName: { $first: "$assetName" },
            requestCount: { $sum: 1 }
          }
        },
        { $sort: { requestCount: -1 } },
        { $limit: 4 }
      ]).toArray();
      res.send(result);
    })

    // HR route: get pie chart data (Returnable vs Non-returnable items requested)
    app.get('/hr/requests-type-stats', verifyToken, verifyHR, async (req, res) => {

      const result = await requestCollection.aggregate([
        {
          $group: {
            _id: "$type",
            count: { $sum: 1 }
          }
        }
      ]).toArray();

      res.send(result);
    });

    // HR will get all asset request by employee name or email
    app.get('/hr/all-requests', verifyToken, verifyHR, async (req, res) => {
      const { search = "" } = req.query;

      const query = {
        $or: [
          { employeeName: { $regex: search, $options: "i" } },
          { employeeEmail: { $regex: search, $options: "i" } }
        ]
      };

      const requests = await requestCollection
        .find(query)
        .sort({ requestDate: -1 })
        .toArray();

      res.send(requests);
    });

    // Approve request and increase assigned assets(PATCH)
    app.patch('/hr/approve-request/:id', verifyToken, verifyHR, async (req, res) => {
      const requestId = req.params.id;

      // 1️: Find the request
      const request = await requestCollection.findOne({
        _id: new ObjectId(requestId)
      });

      if (!request) {
        return res.status(404).send({ message: "Request not found" });
      }

      // Prevent double approval
      if (request.status !== "pending") {
        return res.status(400).send({ message: "Request already processed" });
      }

      // 2️: Find the asset
      const asset = await assetCollection.findOne({
        _id: new ObjectId(request.assetId)
      });

      if (!asset) {
        return res.status(404).send({ message: "Asset not found" });
      }

      const assignedQty = asset.assignedQuantity || 0;
      const requestedQty = request.quantity || 1;

      // 3️: Prevent over-assigning assets
      if (assignedQty + requestedQty > asset.quantity) {
        return res.status(400).send({
          message: "Not enough available assets"
        });
      }

      // 4️: Update request status
      await requestCollection.updateOne(
        { _id: new ObjectId(requestId) },
        { $set: { status: "approved" } }
      );

      // 5️: Update asset assigned quantity
      await assetCollection.updateOne(
        { _id: new ObjectId(request.assetId) },
        {
          $inc: {
            assignedQuantity: requestedQty
          }
        }
      );

      res.send({ message: "Request approved and asset assigned" });
    });

    // Reject request
    app.patch('/hr/reject-request/:id', verifyToken, verifyHR, async (req, res) => {
      const id = req.params.id;

      const result = await requestCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: "rejected" } }
      );

      res.send(result);
    });

    // HR Stats Endpoint
    app.get('/hr/stats', verifyToken, verifyHR, async (req, res) => {

      // Total asset types
      const totalAssets = await assetCollection.countDocuments();

      // Total asset quantity
      const assets = await assetCollection.find().toArray();
      const totalQuantity = assets.reduce(
        (sum, asset) => sum + (asset.quantity || 0),
        0
      );

      // Total requests
      const totalRequests = await requestCollection.countDocuments();

      // Pending requests
      const pendingRequests = await requestCollection.countDocuments({ status: "pending" });

      // Send stats to frontend
      res.send({
        totalAssets,
        totalQuantity,
        totalRequests,
        pendingRequests
      });
    });

    // Get all employees under HR team
    app.get('/hr/employees', verifyToken, verifyHR, async (req, res) => {
      const hr = await userCollection.findOne({ email: req.decoded.email });

      const employees = await userCollection.find({
        isTeamMember: true,
        companyId: hr.companyId
      }).toArray();

      res.send(employees);
    });


    // Remove employee from team
    app.patch('/hr/remove-employee/:id', verifyToken, verifyHR, async (req, res) => {
      const id = req.params.id;

      const result = await userCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            isTeamMember: false,
            companyId: null,
            companyName: null,
            companyLogo: null
          }
        }
      );

      res.send(result);
    });

    // HR package and team status API
    app.get('/hr/package-status', verifyToken, verifyHR, async (req, res) => {
      const hr = await userCollection.findOne({ email: req.decoded.email });

      const teamCount = await userCollection.countDocuments({
        isTeamMember: true,
        companyId: hr.companyId
      });

      res.send({
        teamLimit: hr.teamLimit,
        teamCount,
        canAddMore: teamCount < hr.teamLimit
      });
    });

    // Get all free employees
    app.get('/hr/free-employees', verifyToken, verifyHR, async (req, res) => {
      const employees = await userCollection.find({
        $or: [
          { companyId: { $exists: false } },
          { companyId: null }
        ],
        role: "employee"
      }).toArray();

      res.send(employees);
    });


    // Add one employee to team
    app.patch('/hr/add-employee/:id', verifyToken, verifyHR, async (req, res) => {
      const employeeId = req.params.id;

      const hr = await userCollection.findOne({ email: req.decoded.email });

      const teamCount = await userCollection.countDocuments({
        isTeamMember: true,
        companyId: hr.companyId
      });

      if (teamCount >= hr.teamLimit) {
        return res.status(403).send({ message: "Team limit reached" });
      }

      const result = await userCollection.updateOne(
        { _id: new ObjectId(employeeId) },
        {
          $set: {
            isTeamMember: true,
            companyId: hr.companyId,
            companyName: hr.companyName,
            companyLogo: hr.companyLogo
          }
        }
      );

      res.send(result);
    });

    // Add multiple employees(One API)
    app.patch('/hr/add-selected-employees', verifyToken, verifyHR, async (req, res) => {
      const { employeeIds } = req.body;

      const hr = await userCollection.findOne({ email: req.decoded.email });

      const teamCount = await userCollection.countDocuments({
        isTeamMember: true,
        companyId: hr.companyId
      });

      if (teamCount + employeeIds.length > hr.teamLimit) {
        return res.status(403).send({ message: "Team limit exceeded" });
      }

      const result = await userCollection.updateMany(
        { _id: { $in: employeeIds.map(id => new ObjectId(id)) } },
        {
          $set: {
            isTeamMember: true,
            companyId: hr.companyId,
            companyName: hr.companyName,
            companyLogo: hr.companyLogo
          }
        }
      );

      res.send(result);
    });

    // Package upgrade
    app.patch('/hr/upgrade-package', verifyToken, verifyHR, async (req, res) => {
      const { newLimit } = req.body;

      const result = await userCollection.updateOne(
        { email: req.decoded.email },
        {
          $set: {
            teamLimit: newLimit,
            isPaid: true
          }
        }
      );

      res.send(result);
    });


    // Profile page UPDATE API(PATCH)
    app.patch('/users/profile', verifyToken, async (req, res) => {

      const email = req.decoded.email.toLowerCase().trim();
      console.log(email)

      const { name } = req.body;
      console.log(name)

      const result = await userCollection.updateOne(
        { email },
        { $set: { name } }
      );
      res.send(result);
    });

    // Employees:My Pending Requests
    app.get("/employee/my-pending-requests", verifyToken, async (req, res) => {
      const email = req.decoded.email;
      const result = await requestCollection.find({
        employeeEmail: email,
        status: "pending",
      })
      .sort({createdAt: -1})
      .toArray();

      res.send(result);
    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('HR Manager is sitting')
})

app.listen(port, () => {
  console.log(`HR Manager is sitting on port ${port}`)
})