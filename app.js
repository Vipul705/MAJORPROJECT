if(process.env.NODE_ENV != "production") {
require("dotenv").config();
}
const dns = require("dns")
if (process.env.ATLAS_DNS_SERVER) {
    dns.setServers([process.env.ATLAS_DNS_SERVER]);
}


const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsmate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require("connect-mongo").MongoStore;
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");


const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");



const dbUrl = process.env.ATLASDB_URL;
const sessionSecret = process.env.SESSION_SECRET;

if (!dbUrl) {
    throw new Error("ATLASDB_URL is missing from the environment");
}
if (!sessionSecret) {
    throw new Error("SESSION_SECRET is missing from the environment");
}

const dbConnection = mongoose.connect(dbUrl);






app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({extended: true}));
app.use(methodOverride("_method"));
app.engine('ejs', ejsmate);
app.use(express.static(path.join(__dirname, "/public")));

const store = MongoStore.create({
    clientPromise: dbConnection.then(() => mongoose.connection.getClient()),
    collectionName: "sessions",
    ttl: 7 * 24 * 60 * 60,
    touchAfter: 24 * 60 * 60,
    crypto: { secret: process.env.SESSION_SECRET, 
    },
});
store.on("error", (err) => {
    console.error("Mongo session store error:", err.message);
});

const sessionOptions = {
    store,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: + 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    },
};

// app.get("/", (req, res) => {
//    res.send("Hi, I am root");
// });



app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});

// app.get("/demouser", async (req, res) => {
//     let fakeUser = new User({
//         email: "student@gmail.com",
//         username: "delta-student"
//     });

//    let registerUser = await User.register(fakeUser, "helloworld");
//    res.send(registerdUser);
// });

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);


app.all("/{*splat}", (req, res, next) => {
    next(new ExpressError(404,"Page Not Found!"));
});

app.use((err, req, res, next) => {
   let {statusCode=500, message="something went wrong!"} = err; 
   res.status(statusCode).render("error.ejs", { message});
   //res.status(statusCode).send(message);
 });

async function startServer() {
    try {
        await dbConnection;
        console.log("connected to DB");
        app.listen(8080, () => {
            console.log("server is listening to port 8080");
        });
    } catch (err) {
        console.error("Database connection failed:", err.message);
        process.exitCode = 1;
    }
}

startServer();
