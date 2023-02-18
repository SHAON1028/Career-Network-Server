const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();

require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);




const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const port = process.env.PORT || 5000;

// middleware

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.xk4geth.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri);
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {


  try {
    const userCollection = client.db("carrernetwork").collection("users");
    const categoriesCollection = client
      .db("carrernetwork")
      .collection("categories");
    const jobsCollecton = client.db("carrernetwork").collection("jobs");
    const appliedJobCollection = client.db("carrernetwork").collection("appliedJob");
    const savedJobCollection = client
      .db("carrernetwork")
      .collection("savedJob");
    const notificationsCollection = client.db("carrernetwork").collection("notifications");

    const UserDetails = client.db("carrernetwork").collection("seekerdetails")

    const paymentsCollection = client.db('mobileResale').collection('payments');

    const articleCollection = client.db('carrernetwork').collection('articles')
    const testimonialCollection = client.db("carrernetwork").collection("testimonial")

    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await userCollection.findOne(query);

      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };


    app.get('/jwt', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' })
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: '' })
    });

    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await userCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });

    app.post("/user", async (req, res) => {
      const user = req.body;
      // console.log(user);
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.post("/jobs", async (req, res) => {
      const jobInfo = req.body;
      // console.log(jobInfo);
      const result = await jobsCollecton.insertOne(jobInfo);
      res.send(result);
    });

    app.delete('/deletejob/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await jobsCollecton.deleteOne(query);
      res.send(result);
    })

    app.delete('/deleteApplicant/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await appliedJobCollection.deleteOne(query);
      res.send(result);
    })

    app.get("/applieddetails/:id", async (req, res) => {
      const id = req.params.id;
      const query = { jobId: id };
      const result = await appliedJobCollection.find(query).toArray();;
      res.send(result);
    });



    app.get('/addjobs/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const job = await jobsCollecton.findOne(query);
      res.send(job);
  })
    
    app.get('/addjobs/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const job = await jobsCollecton.findOne(query);
        res.send(job);
    })
    app.get("/featurejob", async (req, res) => {
      const query = {};
      const jobs = await jobsCollecton.find(query).toArray();
      let addvertisjobs = jobs.filter((n) => n.isPaid === true);
      addvertisjobs.length = 6
      res.send(addvertisjobs);
    });

    app.get("/categories", async (req, res) => {
      const query = req.body;
      const result = await categoriesCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/category/:name", async (req, res) => {
      const name = req.params.name;
      const query = { category_name: name };
      const category = await jobsCollecton.find(query).toArray();
      res.send(category);
    });

    //.............payment.............

    app.post('/create-payment-intent', async (req, res) => {
      const booking = req.body;
      const price = booking.value;
      const amount = price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
        currency: 'usd',
        amount: amount,
        "payment_method_types": [
          "card"
        ]
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });


    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const result = await paymentsCollection.insertOne(payment);
      const id = payment._id
      const filter = { _id: ObjectId(id) }
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId
        }
      }
      const updatedResult = await paymentsCollection.updateOne(filter, updatedDoc)
      res.send(result);
    })

    app.put('/addjobs/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) }
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          isPaid: true
        }
      }
      const result = await jobsCollecton.updateOne(filter, updatedDoc, options);
      res.send(result);
    });



    //deshbord authraization check

    app.get("/checkit", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });
    app.get("/alljobs", async (req, res) => {
      let query = {};
      const { keyword, location, category } = req.query
      console.log(keyword, location, category)
      if (keyword) {
        query.job_title = { $regex: keyword, $options: "i" };
      }
      if (location) {
        query.location = { $regex: location, $options: "i" };
      }
      if (category) {
        query.category_name = { $regex: category, $options: "i" };
      }

      const jobs = await jobsCollecton
        .find(query)
        .toArray();

      res.send(jobs);
      console.log(jobs.length)
    });

    // job find by id
    app.get("/alljobs/:id", async (req, res) => {
      const id = req.params.id;
      const job = { _id: ObjectId(id) };
      const result = await jobsCollecton.findOne(job);
      res.send(result);
    });

    // create admin
    app.put("/addAdmin", async (req, res) => {
      const query = req.body;
      const id = { _id: ObjectId(query.id) };
      const option = { upsert: true };
      const updateDoc = {
        $set: {
          role: query.role,
        },
      };
      const result = await userCollection.updateOne(id, updateDoc, option);
      res.send(result);
    });

    // delete user
    app.delete("/deleteUser", async (req, res) => {
      const id = req.query.id;
      const query = { _id: ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // all job seeker find
    app.get("/jobSeeker", async (req, res) => {
      const query = { role: "seeker" };
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });

    // home page features job limitation
    // app.get("/features",async(req,res)=>{
    //     const query = {}
    //     const result = await jobsCollecton.find(query).limit(6).toArray()
    //     res.send(result)
    // })

    //  all admin find
    app.get("/alladmin", async (req, res) => {
      const query = { role: "admin" };
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });

    // admin table remove verify
    app.patch("/removeverify", async (req, res) => {
      const data = req.body;
      const query = { _id: ObjectId(data?.id) };
      const option = { upsert: true };
      const updateDoc = {
        $set: {
          verify: data?.verify,
        },
      };
      const result = await userCollection.updateOne(query, updateDoc, option);
      res.send(result);
    });

    // admin table adding verify
    app.patch("/addingverify", async (req, res) => {
      const data = req.body;
      const query = { _id: ObjectId(data?.id) };
      const option = { upsert: true };
      const updateDoc = {
        $set: {
          verify: data?.verify,
        },
      };
      const result = await userCollection.updateOne(query, updateDoc, option);
      res.send(result);
    });

    //  all recruiter find
    app.get("/recruiter", async (req, res) => {
      const query = { role: "recruiter" };
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });

    // create admin
    app.put("/addAdmin", async (req, res) => {
      const query = req.body;
      const id = { _id: ObjectId(query.id) };
      const option = { upsert: true };
      const updateDoc = {
        $set: {
          role: query.role,
        },
      };
      const result = await userCollection.updateOne(id, updateDoc, option);
      res.send(result);
    });

    // delete user
    app.delete("/deleteUser", async (req, res) => {
      const id = req.query.id;
      const query = { _id: ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // specific recuriter all job post find
    app.get("/recuriterjob", async (req, res) => {
      const email = req.query.email;
      const query = await { recruiterEmail: email };
      const result = await jobsCollecton.find(query).toArray();
      res.send(result);
    });

    // job details
    app.get("/alljobs/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id)
      const query = { _id: ObjectId(id) };

      const job = await jobsCollecton.findOne(query);
      res.send(job);
    });
    // applied job
    app.post("/appliedjob", async (req, res) => {
      const job = req.body;
      // console.log(job)
      const appliedJob = await appliedJobCollection.insertOne(job);
      res.send(appliedJob);
    });
    //check applied job
    app.get("/appliedjob", async (req, res) => {
      const email = req.query.email;
      const idOfJob = req.query._id;
      const query = { applicant_email: email, jobId: idOfJob };
      //   console.log(email);
      //   console.log(idOfJob);
      const findJob = await appliedJobCollection.findOne(query);
      //   console.log(findJob);
      if (findJob) {
        res.send(true);
      } else {
        res.send(false);
      }
    });
    // saved jobs
    app.post("/savedjob", async (req, res) => {
      const job = req.body;
      const savedjob = await savedJobCollection.insertOne(job);
      res.send(savedjob);
    });
    //check saved job
    app.get("/savedjob", async (req, res) => {
      const email = req.query.email;
      const idOfJob = req.query._id;
      const query = { applicant_email: email, jobId: idOfJob };

      const findJob = await savedJobCollection.findOne(query);

      if (findJob) {
        res.send(true);
      } else {
        res.send(false);
      }
    });

    // unsaveJob
    app.delete('/savedjob', async (req, res) => {
      const email = req.query.email;
      const idOfJob = req.query._id;
      //   console.log(email,idOfJob);
      const query = { applicant_email: email, jobId: idOfJob };
      const findJob = await savedJobCollection.deleteOne(query);
      res.send(findJob);
    })


    // save Notifications
    app.post('/notifications', async (req, res) => {
      const notification = req.body
      const query = {}
      const result = await notificationsCollection.insertOne(notification)
      res.send(result)
    })
    app.get('/notifications', async (req, res) => {
      const email = req.query.email
      const query = { companyEmail: email }
      const result = await notificationsCollection.find(query).sort({ createdAt: -1 }).toArray()
      res.send(result)
    })
    app.get('/notificationCount', async (req, res) => {
      const email = req.query.email
      const stat = req.query.status
      const query = { companyEmail: email, status: stat }
      const result = await notificationsCollection.find(query).toArray()

      res.send(result)
    })
    app.put('/notifications', async (req, res) => {
      const email = req.query.email
      const statData = req.body
      // console.log(email,statData)
      const filter = { companyEmail: email }
      const updateDoc = {
        $set: {
          status: statData.status
        },
      };
      const result = await notificationsCollection.updateMany(filter, updateDoc)

      res.send(result)
    })

    // add resume or cv
    app.put("/addresume", async (req, res) => {
      const query = req.body
      const email = { email: query.email }
      const option = { upsert: true }
      const updateDoc = {
        $set: {
          resume: query.resume
        }
      }
      const result = await UserDetails.updateOne(email, updateDoc, option)
      res.send(result)
    })
    
    // post article
    app.post('/articles', async (req, res) => {
      const article = req.body;
      const result = await articleCollection.insertOne(article)
      res.send(result)
    })

    app.get('/articles', async (req, res) => {
      const query = {};
      const result = await articleCollection.find(query).toArray()
      res.send(result)
    })

    // resume data find 
    app.get("/resumefind",async(req,res)=>{
        const query = req.query.email
        const email = {email:query}
        const result = await UserDetails.findOne(email)
        res.send(result)
    })
    //home page blog collection
    app.get("/collectartical",async(req,res)=>{
        const query = {}
        const result = await articleCollection.find(query).limit(9).toArray()
        res.send(result)
    })
    app.get("/teamreview",async(req,res)=>{
      const query = {}
      const result = await testimonialCollection.find(query).toArray()
      res.send(result)
    })
  }
  finally {
  }

}

run().catch((err) => console.error(err));

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.listen(port, (req, res) => {
  console.log(`Server is running on ${port}`);
});
