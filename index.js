const express = require('express')
const app = express();
const cors = require('cors')
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


    const advertisementCollection = client.db('propertyDB').collection('advertisements');
    const reviewCollection = client.db('propertyDB').collection('reviews');
    const propertyCollection = client.db('propertyDB').collection('properties');
    const wishlistCollection = client.db('propertyDB').collection('wishlists');

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

    app.post('/wishlist', async(req, res) => {
        const property = req.body;
        const result = await wishlistCollection.insertOne(property);
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