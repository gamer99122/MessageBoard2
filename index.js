require('dotenv').config();

const express = require('express');
const app = express();
const session = require("express-session");
app.use(session({
  secret: "anything",
  resave: false,
  saveUninitialized: true
}));
app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.static("public"));//管理靜態檔案
app.use(express.urlencoded({ extended: true }));//接受前端post
app.listen(3000, function () {
  console.log("Server Started");
});

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = process.env.DB_URI;

//Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db = null;

async function initDB() {
  try {
    await client.connect();
    db = client.db("mywebsite");
    console.log("連線資料庫");
  } catch (error) {
    console.error("連線資料庫時出錯:", error);
  }
}

initDB().catch(console.error); // 初始化資料庫


app.get("/", async function (req, res) {
  try {
    const collection = db.collection("MessageBoard");
    const result = await collection.find({}).sort({ CDTM: -1 }).toArray();;
    if (result !== null) {
      console.log(result);
    }
    res.render("index.ejs", { result: result });
  } catch (error) {
    console.error("查詢資料庫時出錯:", error);
    res.status(500).send("查詢資料庫時出錯");
  }
});

app.post("/postmessage", async function (req, res) {
  const InputName = req.body.InputName;
  const InputMessage = req.body.InputMessage;

  const nowDate = new Date();
  let collection = db.collection("MessageBoard");
  result = await collection.insertOne({ Name: InputName, Message: InputMessage, CDTM: nowDate });
  res.redirect("/");
});


// 當應用程式結束時關閉資料庫連線
process.on('SIGINT', async () => {
  try {
    await client.close();
    console.log("關閉資料庫");
    process.exit(0);
  } catch (error) {
    console.error("關閉資料庫時出錯:", error);
    process.exit(1);
  }
});


