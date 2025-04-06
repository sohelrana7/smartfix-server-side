require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const exprees = require("express");
const app = exprees();
const port = process.env.PORT || 5000;
const cors = require("cors");

// middleware
app.use(cors());
app.use(exprees.json());

// smartfix
// zrbVjmDEjtdYqzfk

const uri = `mongodb+srv://smartfix:zrbVjmDEjtdYqzfk@cluster0.7heaa.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const servicesCollection = client.db("smartfixDB").collection("services");

    app.post("/add-service", async (req, res) => {
      const serviceData = req.body;
      const result = await servicesCollection.insertOne(serviceData);
      res.send(result);
    });

    //get all services data from db
    app.get("/services", async (req, res) => {
      const result = await servicesCollection.find().toArray();
      res.send(result);
    });
    // get all service posted by a specific user
    app.get("/services/:email", async (req, res) => {
      const email = req.params.email;
      const query = { "provider.provider_email": email };
      const result = await servicesCollection.find(query).toArray();
      res.send(result);
    });
    // single service
    app.get("/service/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await servicesCollection.findOne(query);
      res.send(result);
    });

    // update service
    app.put("/update-service/:id", async (req, res) => {
      const id = req.params.id;
      const serviceData = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: serviceData,
      };
      const options = { upsert: true };
      const result = await servicesCollection.updateOne(
        query,
        updateDoc,
        options
      );
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello from SmartFix Server....");
});

app.listen(port, () => console.log(`Server running on port ${port}`));
