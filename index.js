require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const exprees = require("express");
const jwt = require("jsonwebtoken");
const app = exprees();
const port = process.env.PORT || 5000;
const cors = require("cors");
const cookieParser = require("cookie-parser");

// middleware
app.use(
  cors({
    origin: "http://localhost:5173", // Allow frontend URL
    credentials: true, // Allow cookies/auth headers
  })
);
// app.use(cors());
app.use(exprees.json());
app.use(cookieParser());

// smartfix
// zrbVjmDEjtdYqzfk

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  console.log("verifyToken", token);
  if (!token) return res.status(401).send({ message: "unauthorized access" });
  jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "auauthorized access" });
    }
    console.log("decoded token", decoded);
    req.user = decoded;
  });
  next();
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7heaa.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

    // generate jwt
    app.post("/jwt", async (req, res) => {
      const { email } = req.body;
      console.log("email befor create token", email);
      // create token
      const token = jwt.sign({ email }, process.env.SECRET_KEY, {
        expiresIn: "1d",
      });
      console.log("token server", token);
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // logout || clear cookie from browser
    app.get("/logout", async (req, res) => {
      res
        .clearCookie("token", {
          maxAge: 0,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

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
    // get all service by search
    app.get("/all-services", async (req, res) => {
      const search = req.query.search;
      let options = {};
      let query = {
        service_name: {
          $regex: search,
          $options: "i",
        },
      };
      const result = await servicesCollection.find(query, options).toArray();
      res.send(result);
    });

    // get all service posted by a specific user
    app.get("/services/:email", verifyToken, async (req, res) => {
      const decodedEmail = req.user?.email;
      const email = req.params.email;
      // console.log("email from token", decodedEmail);
      // console.log("email from params", email);
      if (decodedEmail !== email) {
        return res.status(401).send({ message: "unauthorized access" });
      }
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
      // 0. if a user placed a service already in this service
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
    app.get("/bookings/:email", verifyToken, async (req, res) => {
      const decodedEmail = req.user?.email;
      const isProvider = req.query.provider;
      const email = req.params.email;
      // console.log("email from params", email);
      // console.log("email from token", decodedEmail);
      if (decodedEmail !== email) {
        return res.status(401).send({ message: "unauthorized access" });
      }
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
