if(process.env.NODE_ENV !== "production"){
    require("dotenv").config();
}

const express = require("express");
const app = express();
const methodOverride = require('method-override');
const path = require("path");
const ExpressError = require("./Utilities/ExpressError");
const morgan = require("morgan");
const  mongoose = require("mongoose");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const localStrategy = require("passport-local");
const Campground = require("./models/campground");
const Review = require("./models/review");
const User = require("./models/user");  
const helmet = require("helmet");   //security
const MongoDBStore = require("connect-mongo");

const mongoSanitize = require("express-mongo-sanitize");

//Routes
const userRoutes = require("./routes/users");
const campgroundRoutes = require("./routes/campgrounds");
const reviewRoutes = require("./routes/reviews");

//To log incoming requests
app.use(morgan("tiny"));
//To use ejs-mate as ejs engine
app.engine("ejs", ejsMate);
//To parse form data in POST request body:
app.use(express.urlencoded({ extended: true }))
// To parse incoming JSON in POST request body:
app.use(express.json())
// To 'fake' put/patch/delete requests:
app.use(methodOverride('_method'))
// To serve assets
app.use(express.static(path.join(__dirname, "public")));
//To sanitize user inputs
app.use(mongoSanitize());
//For secutity
app.use(helmet({contentSecurityPolicy: false}));


const scriptSrcUrls = [
    // "https://stackpath.bootstrapcdn.com/",
    "https://api.tiles.mapbox.com/",
    "https://api.mapbox.com/",
    "https://kit.fontawesome.com/",
    "https://cdnjs.cloudflare.com/",
    "https://cdn.jsdelivr.net",
];
const styleSrcUrls = [
    "https://kit-free.fontawesome.com/",
    // "https://stackpath.bootstrapcdn.com/",
    "https://api.mapbox.com/",
    "https://api.tiles.mapbox.com/",
    "https://fonts.googleapis.com/",
    "https://use.fontawesome.com/",
    "https://cdn.jsdelivr.net",
];
const connectSrcUrls = [
    "https://api.mapbox.com/",
    "https://a.tiles.mapbox.com/",
    "https://b.tiles.mapbox.com/",
    "https://events.mapbox.com/",
];
const fontSrcUrls = [];
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: [],
            connectSrc: ["'self'", ...connectSrcUrls],
            scriptSrc: ["'unsafe-inline'", "'self'", ...scriptSrcUrls],
            styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
            workerSrc: ["'self'", "blob:"],
            objectSrc: [],
            imgSrc: [
                "'self'",
                "blob:",
                "data:",
                "https://res.cloudinary.com/dv7tj0hmo/", //SHOULD MATCH YOUR CLOUDINARY ACCOUNT! 
                "https://images.unsplash.com/",
            ],
            fontSrc: ["'self'", ...fontSrcUrls],
        },
    })
);

const dbUrl = process.env.DB_URL || "mongodb://localhost:27017/yelp-camp"
const secret = process.env.SECRET || "thisshoudbeabettersecret";
const store = new MongoDBStore({
    mongoUrl: dbUrl,
    secret:secret,
    touchAfter: 24 * 60 * 60

})

// store.on('error', function(e){
//     console.log("Session Store ERROR", e);
// })

const sessionConfig = {
    // store,
    name: 'session',
    secret: secret,
    resave: false,
    saveUninitialized: true,
    cookie : {
        httpOnly: true,
        // secure: true, 
        expires: Date.now() + 1000*60*60*24*7,
        maxAge: 1000*60*60*24*7
    }
}
app.use(session(sessionConfig));
app.use(flash());
//middleware for session() must be done before passport
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//To provide flash message
app.use((req, res, next) => {
    res.locals.currentUser= req.user;
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    next();
})



mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false
});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connetcted");
});

// Views folder and EJS setup:
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.get("/fakeUser", async (req, res) => {
    const user = new User({email: "ashish.suman927@gmail.com", username: 'Ashish'})
    const newUser = await User.register(user, "password");
})

app.use("/", userRoutes);
app.use("/campgrounds", campgroundRoutes);
app.use("/campgrounds/:id/reviews", reviewRoutes);

app.get("/", (req, res) => {
    res.render("home");
});




app.all("*", (req, res, next) => {
    next(new ExpressError("Page Not Found", 404));
});
//Error Handler
app.use((err, req, res, next) => {
    const { statusCode = 500} = err;
    if(!err.message)
        err.message = "Oh no, Something went wrong"
    res.status(statusCode).render("error", {err});
});


app.listen(3000, () => {
    console.log("Running on port 3000");
});