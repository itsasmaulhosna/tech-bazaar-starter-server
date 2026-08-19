const dns = require('node:dns');
dns.setServers(['1.1.1.1', '1.0.0.1']);

const express = require('express');
const dontenv = require('dotenv');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
dontenv.config();

const uri = process.env.MONGODB_URI;

const app = express();
const PORT = process.env.PORT;

app.use(
  cors({
    credentials: true,
    origin: [process.env.CLIENT_URL],
  }),
);
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const db = client.db('tech-bazaar');
    const subscriptionCollection = db.collection('subscriptions');
    const paymentCollection = db.collection('payments');
    const userCollection = db.collection('user');
    const productCollection = db.collection('products');
    // subscription api
    app.post('/subscription', async (req, res) => {
      const { user, session_id } = req.body;
      const isExistSession = await subscriptionCollection.findOne({
        session_id,
      });
      if (isExistSession) {
        return res
          .status(400)
          .send({ message: 'Subscription already exists for this session_id' });
      }
      const subs_result = await subscriptionCollection.insertOne({
        userId: new ObjectId(user.id),
        session_id,
      });
      const dbUser = await userCollection.findOne({
        email: user.email,
      });

      console.log('DB User:', dbUser);

      const user_result = await userCollection.updateOne(
        { email: user.email },
        {
          $set: {
            plan: 'pro',
          },
        },
      );
      res.send({
        subs_result,
        user_result,
      });
    });
    // payment api
    app.post('/payment', async (req, res) => {
      const { price, name, userId, productId, session_id } = req.body;
      const isExistSession = await paymentCollection.findOne({
        session_id,
      });
      if (isExistSession) {
        return res
          .status(400)
          .send({ message: 'Payment already exists for this session_id' });
      }
      const pays_result = await paymentCollection.insertOne({
        userId,
        session_id,
        price: Number(price),
        name,
        productId,
      });

      res.send({
        pays_result,
      });
    });
    // products api
    app.post('/products', async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne({
        ...product,
        price: Number(product.price),
        quantity: Number(product.quantity),
      });
      res.send(result);
    });
    // get products
    app.get('/products', async (req, res) => {
      const result = await productCollection.find().toArray();
      res.send(result);
    });
    // get product by id
    app.get('/products/:id', async (req, res) => {
      const { id } = req.params;
      const result = await productCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });
    await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!',
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Server is running fine!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
