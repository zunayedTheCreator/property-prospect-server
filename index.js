const express = require('express')
const app = express();
const cors = require('cors')
const jwt = require('jsonwebtoken')
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
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
        return res.status(401).send({message: 'unauthorized access'})
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({message: 'unauthorized access'})
        }
        req.decoded = decoded;
        next();
      })
    }

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next();
    }

    const verifyAgent = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAgent = user?.role === 'agent';
      if (!isAgent) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next();
    }

    // ----- Users API -----
    app.get('/user', verifyToken, async(req, res) => {
        const result = await userCollection.find().toArray();
        res.send(result);
    })

    app.get('/user/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({message: 'forbidden access'})
      }

      const query = {email: email}
      const user = await userCollection.findOne(query)
      let admin = false;
      if (user) {
        admin = user?.role === 'admin'
      }
      res.send({admin})
    })

    app.get('/user/normal/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = {email: email}
      const user = await userCollection.findOne(query)
      res.send(user)
    })

    app.get('/user/agent/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({message: 'unauthorized access'})
      }

      const query = {email: email}
      const user = await userCollection.findOne(query)
      let agent = false;
      if (user) {
        agent = user?.role === 'agent'
      }
      res.send({agent})
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

    app.patch('/user/admin/:id',verifyToken, verifyAdmin, async (req, res) => {
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

    app.patch('/user/agent/:id', verifyToken, verifyAdmin, async (req, res) => {
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

    app.patch('/user/fraud/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: 'fraud'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result)
    })

    app.delete('/user/:id', verifyToken, verifyAdmin, async(req, res) => {
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

    app.post('/advertisement', verifyToken, verifyAdmin, async(req, res) => {
        const property = req.body;
        const result = await advertisementCollection.insertOne(property);
        res.send(result)
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

    app.get('/property/search/:identifier', verifyToken, async (req, res) => {
        const { identifier } = req.params;
        const query = { property_location: new RegExp(identifier, 'i') };
        const result = await propertyCollection.find(query).toArray();
        res.send(result);
    });

    app.get('/property/:id', async(req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }
        const result = await propertyCollection.findOne(query)
        res.send(result)
    })

    app.get('/property/normal/:email', verifyToken, verifyAgent, async (req, res) => {
      const email = req.params.email;
      const query = {agent_email: email}
      const properties = await propertyCollection.find(query).toArray();
      res.send(properties)
    })

    app.post('/property', verifyToken, verifyAgent, async(req, res) => {
        const property = req.body;
        const result = await propertyCollection.insertOne(property);
        res.send(result)
    })

    app.patch('/property/:id', verifyToken, verifyAgent, async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          property_title: item.property_title,
          property_location: item.property_location,
          property_image: item.property_image,
          agent_name: item.agent_name,
          agent_email: item.agent_email,
          price_range: item.price_range,
          description: item.description,
        }
      }
      const result = await propertyCollection.updateOne(filter, updatedDoc);
      res.send(result)
    })

    app.patch('/property/verified/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          verification_status: 'Verified'
        }
      }
      const result = await propertyCollection.updateOne(filter, updatedDoc);
      res.send(result)
    })

    app.patch('/property/rejected/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          verification_status: 'Rejected'
        }
      }
      const result = await propertyCollection.updateOne(filter, updatedDoc);
      res.send(result)
    })

    app.patch('/property/advertised/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          advertised: true
        }
      }
      const result = await propertyCollection.updateOne(filter, updatedDoc);
      res.send(result)
    })

    app.delete('/property/:id',verifyToken, verifyAgent, async(req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }
        const result = await propertyCollection.deleteOne(query)
        res.send(result)
    })

    app.delete('/property/fraud/:agent_email', verifyToken, verifyAdmin, async (req, res) => {
        const agent_email = req.params.agent_email;
    
        const query = { agent_email: agent_email };
    
        try {
            const result = await propertyCollection.deleteMany(query);
            res.send(result);
        } catch (error) {
            console.error('Error occurred:', error);
            res.status(500).send({ message: 'An error occurred while deleting the documents' });
        }
    });

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
    
    // ----- Brought Property API -----
    app.get('/brought-property', async(req, res) => {
        const result = await broughtPropertyCollection.find().toArray();
        res.send(result);
    })

    app.get('/brought-property/:id', async(req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }
        const result = await broughtPropertyCollection.findOne(query)
        res.send(result)
    })

    app.get('/brought-property/normal/:email', verifyToken, verifyAgent, async (req, res) => {
      const email = req.params.email;
      const query = {agent_email: email}
      const properties = await broughtPropertyCollection.find(query).toArray();
      res.send(properties)
    })

    app.post('/brought-property', verifyToken, async(req, res) => {
        const property = req.body;
        const result = await broughtPropertyCollection.insertOne(property);
        res.send(result)
    })

    app.patch('/brought-property/accepted/:id/:main_id', verifyToken, verifyAgent, async (req, res) => {
        const id = req.params.id;
        const main_id = req.params.main_id;

        const rejectFilter = { 
            main_id: main_id, 
            _id: { $ne: new ObjectId(id) } 
        };
        const rejectUpdate = {
            $set: {
                status: 'Rejected'
            }
        };

        const acceptFilter = { _id: new ObjectId(id) };
        const acceptUpdate = {
            $set: {
                status: 'Accepted'
            }
        };
    
        try {
            const rejectResult = await broughtPropertyCollection.updateMany(rejectFilter, rejectUpdate);
            const acceptResult = await broughtPropertyCollection.updateOne(acceptFilter, acceptUpdate);
            res.send({ rejectResult, acceptResult });
        } catch (error) {
            console.error('Error occurred:', error);
            res.status(500).send({ message: 'An error occurred while updating the documents' });
        }
    });

    app.patch('/brought-property/rejected/:id', verifyToken, verifyAgent, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: 'Rejected'
        }
      }
      const result = await broughtPropertyCollection.updateOne(filter, updatedDoc);
      res.send(result)
    })

    app.patch('/brought-property/rejected/:id', verifyToken, verifyAgent, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: 'Rejected'
        }
      }
      const result = await broughtPropertyCollection.updateOne(filter, updatedDoc);
      res.send(result)
    })

    app.patch('/brought-property/bought/:id', verifyToken, async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: 'Bought',
          transition_id: item.transition_id
        }
      }
      const result = await broughtPropertyCollection.updateOne(filter, updatedDoc);
      res.send(result)
    })

    app.delete('/brought-property/fraud/:agent_email', verifyToken, verifyAdmin, async (req, res) => {
        const agent_email = req.params.agent_email;
    
        const query = { agent_email: agent_email };
    
        try {
            const result = await broughtPropertyCollection.deleteMany(query);
            res.send(result);
        } catch (error) {
            console.error('Error occurred:', error);
            res.status(500).send({ message: 'An error occurred while deleting the documents' });
        }
    });

    // ----- Payment Intent -----
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ['card'],
      })

      res.send({
        clientSecret: paymentIntent.client_secret
      })
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