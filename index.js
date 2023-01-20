const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
require('dotenv').config();

const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000;

// middleware

app.use(cors())
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.xk4geth.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const userCollection = client.db('carrernetwork').collection('users');
        const categoriesCollection = client.db('carrernetwork').collection('categories');
        const jobsCollecton = client.db('carrernetwork').collection('jobs');

        app.post('/user', async (req, res) => {
            const user = req.body;
            console.log(user);
            const result = await userCollection.insertOne(user);
            res.send(result);
        });
       
        app.get('/categories', async(req, res)=>{
            const query = req.body;
            const result = await categoriesCollection.find(query).toArray()
            res.send(result)
        })
        app.get('/category/:name', async (req, res)=>{
            const name = req.params.name
            const query = {category_name : name}
            const category = await jobsCollecton.find(query).toArray()
            res.send(category)
         })


    }
    finally {

    }

}

run().catch(err => console.error(err));




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









app.get('/', (req, res) => {
    res.send('Server is running')
})

app.listen(port, (req, res) => {
    console.log(`Server is running on ${port}`)
});