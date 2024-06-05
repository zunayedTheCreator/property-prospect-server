const express = require('express')
const app = express();
const cors = require('cors')
const jwt = require('jsonwebtoken')
require('dotenv').config()
const port = process.env.PORT || 5000;

// middleware
app.use(cors())
app.use(express.json())

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kbuydyl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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


    const userCollection = client.db('propertyDB').collection('users');
    const advertisementCollection = client.db('propertyDB').collection('advertisements');
    const reviewCollection = client.db('propertyDB').collection('reviews');
    const propertyCollection = client.db('propertyDB').collection('properties');
    const wishlistCollection = client.db('propertyDB').collection('wishlists');
    const broughtPropertyCollection = client.db('propertyDB').collection('broughtProperties');

    // ----- JWT API -----
    app.post('/jwt', async(req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ token })
    })

    // middlewares
    const verifyToken = (req, res, next) => {
      console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({message: 'forbidden access'})
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({message: 'forbidden access'})
        }
        req.decoded = decoded;
        next();
      })
    }

    // ----- Users API -----
    app.get('/user', verifyToken, async(req, res) => {
        const result = await userCollection.find().toArray();
        res.send(result);
    })

    app.post('/user', async(req, res) => {
        const user = req.body;
        const query = {email: user.email}
        const existingUser = await userCollection.findOne(query);
        if (existingUser) {
          return res.send({ message: 'user already exist', insertedId: null})
        }
        const result = await userCollection.insertOne(user);
        res.send(result)
    })

    app.patch('/user/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result)
    })

    app.patch('/user/agent/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'agent'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result)
    })

    app.delete('/user/:id', async(req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }
        const result = await userCollection.deleteOne(query)
        res.send(result)
    })

    // ----- Advertisements API -----
    app.get('/advertisement', async(req, res) => {
        const result = await advertisementCollection.find().toArray();
        res.send(result);
    })

    // ----- Reviews API -----
    app.get('/review', async(req, res) => {
        const result = await reviewCollection.find().toArray();
        res.send(result);
    })

    app.post('/review', async(req, res) => {
        const review = req.body;
        const result = await reviewCollection.insertOne(review);
        res.send(result)
    })

    app.delete('/review/:id', async(req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }
        const result = await reviewCollection.deleteOne(query)
        res.send(result)
    })

    // ----- Properties API -----
    app.get('/property', async(req, res) => {
        const result = await propertyCollection.find().toArray();
        res.send(result);
    })

    app.get('/property/:id', async(req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }
        const result = await propertyCollection.findOne(query)
        res.send(result)
    })

    // ----- WishLists API -----
    app.get('/wishlist', async(req, res) => {
        const result = await wishlistCollection.find().toArray();
        res.send(result);
    })
    
    app.get('/wishlist/:id', async(req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }
        const result = await wishlistCollection.findOne(query)
        res.send(result)
    })

    app.post('/wishlist', async(req, res) => {
        const property = req.body;
        const result = await wishlistCollection.insertOne(property);
        res.send(result)
    })

    app.delete('/wishlist/:id', async(req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }
        const result = await wishlistCollection.deleteOne(query)
        res.send(result)
    })
    
    // ----- WishLists API -----
    app.get('/brought-property', async(req, res) => {
        const result = await broughtPropertyCollection.find().toArray();
        res.send(result);
    })

    app.post('/brought-property', async(req, res) => {
        const property = req.body;
        const result = await broughtPropertyCollection.insertOne(property);
        res.send(result)
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
    res.send('property is waiting!!!')
})

app.listen(port, () => {
    console.log(`Your property is waiting on ${port}`);
})