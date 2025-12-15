const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion } = require('mongodb');
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


    // JWT related API
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
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



    // create user
    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // Get all users
    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // get user by email
    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;

      const query = { email: email };
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