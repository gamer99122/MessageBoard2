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
        res.render("index.ejs");
    } catch (error) {
        console.error("查詢資料庫時出錯:", error);
        res.status(500).send("查詢資料庫時出錯");
    }
});

//會員頁面
app.get("/member", async function (req, res) {
    let member = req.session.member;

    if (member == null) {
        return res.redirect("error?msg=非法會員，請重新登入");
    }
    const collection = db.collection("MessageBoard");
    const result = await collection.find({}).sort({ CDTM: -1 }).toArray();;
    res.render("member.ejs", { member: member, result: result });
});

app.post("/postmessage", async function (req, res) {
    let member = req.session.member;
    const InputName = member.name;
    const InputMessage = req.body.InputMessage;

    const nowDate = new Date();
    let collection = db.collection("MessageBoard");
    result = await collection.insertOne({ Name: InputName, Message: InputMessage, CDTM: nowDate });
    res.redirect("member");
});

//登入會員
app.post("/singin", async function (req, res) {
    const email = req.body.loginEmail;
    const password = req.body.loginPWD;

    let collection = db.collection("user");
    let result = await collection.findOne({ $and: [{ email: email }, { password: password }] });

    if (result == null) {
        return res.redirect("/error?msg=登入失敗，郵件或密碼輸入錯誤");
    }
    req.session.member = result;
    res.redirect("/member");
});

//註冊會員
app.post("/signup", async function (req, res) {
    const name = req.body.registName
    const email = req.body.registEmail;
    const password = req.body.registPWD;
    let collection = db.collection("user");
    let result = await collection.findOne({ $and: [{ email: email }, { password: password }] });
    if (result !== null) {
        return res.redirect("/error?msg=註冊失敗，信箱重複");
    }

    // 如果信箱不重複，則將新會員資料插入資料庫
    result = await collection.insertOne({ name: name, email: email, password: password });
    res.redirect("/");

});


//登出會員
app.get("/singout", function (req, res) {
    req.session.member = null;
    res.redirect("/");
});



//錯誤頁面/error?msg=錯誤訊息
app.get("/error", function (req, res) {
    const msg = req.query.msg;
    res.render("error.ejs", { msg: msg });
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


