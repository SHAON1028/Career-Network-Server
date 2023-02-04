const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
require('dotenv').config();


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

// middleware

app.use(cors())
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.xk4geth.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' });
        }
        req.decoded = decoded;
        next();
    })
}


async function run() {
    try {
        const userCollection = client.db('carrernetwork').collection('users');
        const categoriesCollection = client.db('carrernetwork').collection('categories');
        const jobsCollecton = client.db('carrernetwork').collection('jobs');

        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await userCollection.findOne(query);

            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await userCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' });
        })


        app.post('/user', async (req, res) => {
            const user = req.body;
            console.log(user);
            const result = await userCollection.insertOne(user);
            res.send(result);
        });

        app.post('/jobs', async (req, res) => {
            const jobInfo = req.body;
            console.log(jobInfo);
            const result = await jobsCollecton.insertOne(jobInfo);
            res.send(result);
        });

        app.get('/featurejob', async (req, res) => {
            const query = {};
            const jobs = await jobsCollecton.find(query).toArray();
            const addvertisjobs = jobs.filter(n => n.isPaid === true);
            res.send(addvertisjobs);

        });


        app.get('/categories', async (req, res) => {
            const query = req.body;
            const result = await categoriesCollection.find(query).toArray()
            res.send(result)
        })
        app.get('/category/:name', async (req, res) => {
            const name = req.params.name
            const query = { category_name: name }
            const category = await jobsCollecton.find(query).toArray()
            res.send(category)
        })

        //deshbord authraization check

        app.get("/checkit", async (req, res) => {
            const email = req.query.email
            const query = { email: email }
            const result = await userCollection.findOne(query)
            res.send(result)
        })
        app.get('/alljobs', async (req, res) => {

            const query = {}
            const page = parseInt(req.query.page)
            const size = parseInt(req.query.size)
            const jobs = await jobsCollecton.find(query).skip(page * size).limit(size).toArray()
            const count = await jobsCollecton.estimatedDocumentCount()
            res.send({ count, jobs })
        })

        // job find by id
        app.get('/alljobs/:id',async (req, res) =>{
            const id = req.params.id;
            const job = {_id : ObjectId(id)}
            const result = await jobsCollecton.findOne(job)
            res.send(result)
        } )

        //  all recruiter find
        app.get('/recruiter', async (req, res) => {
            const query = { role: "recruiter" };
            const result = await userCollection.find(query).toArray()
            res.send(result)
        })

        // create admin
        app.put("/addAdmin", async (req, res) => {
            const query = req.body
            const id = { _id: ObjectId(query.id) }
            const option = { upsert: true }
            const updateDoc = {
                $set: {
                    role: query.role
                }
            }
            const result = await userCollection.updateOne(id, updateDoc, option)
            res.send(result)
        })

        // delete user 
        app.delete('/deleteUser', async (req, res) => {
            const id = req.query.id
            const query = { _id: ObjectId(id) }
            const result = await userCollection.deleteOne(query)
            res.send(result)
        })

        // all job seeker find 
        app.get('/jobSeeker', async (req, res) => {
            const query = { role: "seeker" }
            const result = await userCollection.find(query).toArray();
            res.send(result)
        })

        // home page features job limitation
        // app.get("/features",async(req,res)=>{
        //     const query = {}
        //     const result = await jobsCollecton.find(query).limit(6).toArray()
        //     res.send(result)
        // })

        //  all admin find
        app.get("/alladmin", async (req, res) => {
            const query = { role: "admin" }
            const result = await userCollection.find(query).toArray()
            res.send(result)
        })

        // admin table remove verify
        app.patch("/removeverify", async (req, res) => {
            const data = req.body
            const query = { _id: ObjectId(data?.id) }
            const option = { upsert: true }
            const updateDoc = {
                $set: {
                    verify: data?.verify
                }
            }
            const result = await userCollection.updateOne(query, updateDoc, option)
            res.send(result)
        })

        // admin table adding verify
        app.patch("/addingverify", async (req, res) => {
            const data = req.body
            const query = { _id: ObjectId(data?.id) }
            const option = { upsert: true }
            const updateDoc = {
                $set: {
                    verify: data?.verify
                }
            }
            const result = await userCollection.updateOne(query, updateDoc, option)
            res.send(result)
        })

        // specific recuriter all job post find
        app.get("/recuriterjob", async (req, res) => {
            const email = req.query.email;
            const query = await { recruiterEmail: email }
            const result = await jobsCollecton.find(query).toArray()
            res.send(result)
        })

        //  all recruiter find
        app.get('/recruiter', async (req, res) => {
            const query = { role: "recruiter" };
            const result = await userCollection.find(query).toArray()
            res.send(result)
        })

        // create admin
        app.put("/addAdmin", async (req, res) => {
            const query = req.body
            const id = { _id: ObjectId(query.id) }
            const option = { upsert: true }
            const updateDoc = {
                $set: {
                    role: query.role
                }
            }
            const result = await userCollection.updateOne(id, updateDoc, option)
            res.send(result)
        })

        // delete user 
        app.delete('/deleteUser', async (req, res) => {
            const id = req.query.id
            const query = { _id: ObjectId(id) }
            const result = await userCollection.deleteOne(query)
            res.send(result)
        })

        // all job seeker find 
        app.get('/jobSeeker', async (req, res) => {
            const query = { role: "seeker" }
            const result = await userCollection.find(query).toArray();
            res.send(result)
        })

        // home page features job limitation
        // app.get("/features",async(req,res)=>{
        //     const query = {}
        //     const result = await jobsCollecton.find(query).limit(6).toArray()
        //     res.send(result)
        // })

        //  all admin find
        app.get("/alladmin", async (req, res) => {
            const query = { role: "admin" }
            const result = await userCollection.find(query).toArray()
            res.send(result)
        })

        // admin table remove verify
        app.patch("/removeverify", async (req, res) => {
            const data = req.body
            const query = { _id: ObjectId(data?.id) }
            const option = { upsert: true }
            const updateDoc = {
                $set: {
                    verify: data?.verify
                }
            }
            const result = await userCollection.updateOne(query, updateDoc, option)
            res.send(result)
        })

        // admin table adding verify
        app.patch("/addingverify", async (req, res) => {
            const data = req.body
            const query = { _id: ObjectId(data?.id) }
            const option = { upsert: true }
            const updateDoc = {
                $set: {
                    verify: data?.verify
                }
            }
            const result = await userCollection.updateOne(query, updateDoc, option)
            res.send(result)
        })

        // specific recuriter all job post find
        app.get("/recuriterjob", async (req, res) => {
            const email = req.query.email;
            const query = await { recruiterEmail: email }
            const result = await jobsCollecton.find(query).toArray()
            res.send(result)
        })

    }
    finally {

    }

}

run().catch(err => console.error(err));



app.get('/', (req, res) => {
    res.send('Server is running')
})

app.listen(port, (req, res) => {
    console.log(`Server is running on ${port}`)
});