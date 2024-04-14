const express = require("express");
const mongoose = require("mongoose");
const app = express();
const Listing = require("./models/listings");
const User = require("./models/user"); // Import the User model
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy; // Import LocalStrategy

// Connect to MongoDB
const MONGO_URL = "mongodb://127.0.0.1:27017/avaas";

async function main() {
  try {
    await mongoose.connect(MONGO_URL);
    console.log("Connected to database");
  } catch (err) {
    console.error("Database connection error:", err);
  }
}

main();

// Set up middleware and view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "public")));

// Define passport local strategy
passport.use(
  new LocalStrategy(async function (username, password, done) {
    try {
      const user = await User.findOne({ username, password });
      if (!user) {
        return done(null, false, { message: "Invalid username or password" });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

// Serialize and deserialize user
passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(async function (id, done) {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Session configuration
const sessionOptions = {
  secret: "your-secret-key",
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 60000 },
};
app.use(session(sessionOptions));

// Flash messages
app.use(flash());

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Define login and signup routes
app.get("/login", (req, res) => {
  res.render("login");
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
    failureFlash: true,
  })
);

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      req.flash("error", "Username already taken");
      return res.redirect("/signup");
    }
    const newUser = new User({ username, email, password });
    await newUser.save();
    req.flash("success", "Account created successfully");
    res.redirect("/login");
  } catch (err) {
    console.error("Signup error:", err);
    req.flash("error", "Internal server error");
    res.redirect("/signup");
  }
});

// Add authentication middleware to protect routes that require login
function requireLogin(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

// Dashboard route (example of a protected route)
app.get("/dashboard", requireLogin, (req, res) => {
  res.render("dashboard");
});

//index route.
app.get("/listings", async (req, res) => {
  const allListings = await Listing.find({});
  res.render("index.ejs", { allListings });
});

//new route
app.get("/listings/new", (req, res) => {
  res.render("new.ejs");
});

//show route(specific post)
app.get("/listings/:id", async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  res.render("show.ejs", { listing });
});

//create route
app.post("/listings", async (req, res) => {
  const newListing = new Listing(req.body.listing);
  await newListing.save();
  res.redirect("/listings");
});

//edit route.
app.get("/listings/:id/edit", async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  await res.render("edit.ejs", { listing });
});

//UPDATE ROUTE
app.put("/listings/:id", async (req, res) => {
  let { id } = req.params;
  await Listing.findByIdAndUpdate(id, { ...req.body.listing });
  res.redirect("/listings");
});

//deletion route
app.delete("/listings/:id", async (req, res) => {
  let { id } = req.params;
  let deletedListing = await Listing.findByIdAndDelete(id);
  console.log(deletedListing);
  res.redirect("/listings");
});

// Start the server
app.listen(8080, () => {
  console.log("App is listening to port 8080");
});
