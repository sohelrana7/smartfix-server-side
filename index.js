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
    const bookingsCollection = client.db("smartfixDB").collection("bookings");

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
    //delete a service from db
    app.delete("/service/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await servicesCollection.deleteOne(query);
      res.send(result);
    });
    // save a booking in db
    app.post("/add-booking", async (req, res) => {
      const bookingData = req.body;
      console.log("req.body", bookingData);
      // 0. if a user placed a bid already in this job
      const query = {
        user_email: bookingData.user_email,
        service_Id: bookingData.service_Id,
      };
      const alreadyExist = await bookingsCollection.findOne(query);
      console.log("if already exist", alreadyExist);
      if (alreadyExist) {
        return res
          .status(400)
          .json({ error: "You have already booked on this service" });
      }
      const result = bookingsCollection.insertOne(bookingData);
      res.send(result);
    });

    // get all booking by a specific user
    app.get("/bookings/:email", async (req, res) => {
      const isProvider = req.query.provider;
      const email = req.params.email;
      let query = {};
      if (isProvider) {
        query.provider_email = email;
      } else {
        query.user_email = email;
      }
      const result = await bookingsCollection.find(query).toArray();
      res.send(result);
    });
    // update booking status
    app.patch("/booking-status-update/:id", async (req, res) => {
      const id = req.params.id;
      const { newStatus } = req.body;
      console.log(newStatus);
      const filter = { _id: new ObjectId(id) };
      const updated = {
        $set: { service_status: newStatus },
      };
      const result = await bookingsCollection.updateOne(filter, updated);
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
