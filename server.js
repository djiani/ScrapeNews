const express = require("express");
const logger = require("morgan");
const mongoose = require("mongoose");

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
const axios = require("axios");
const cheerio = require("cheerio");

// Require all models
const db = require("./models");

const  PORT = process.env.PORT || 8080;

// Initialize Express
const app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Make public a static folder
app.use(express.static("public"));

// Connect to the Mongo DB
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines"
mongoose.connect(MONGODB_URI);

// Routes

// A GET route for scraping the cnet website
app.get("/scrape", function (req, res) {
  // First, we grab the body of the html with axios
  axios.get("https://www.cnet.com/").then(function (response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    const $ = cheerio.load(response.data);

    const DataSeed = [];
    $(".latestScrollItems").find("h3").each((i, elt) => {
      let news = {}
      news.title = $(elt).children("a").text()
      news.link = $(elt).children("a").attr("href");
      news.description = $(elt).siblings("p").children("a").text();
      news.img = $(elt).parent().siblings("figure").find("img").attr("src");

      if (news) DataSeed.push(news);

    })
    if (DataSeed) {
      db.Article.create(DataSeed)
        .then(dbArticles => {
          res.json(dbArticles);
        }).catch(err => {
          res.status(500).json({ error: err.message });
        })
    }



  });
});

// Route for getting all articles from the db
app.get("/articles", function (req, res) {
  db.Article.find()
    .populate("notes")
    .then(function (dbArticles) {
      res.json(dbArticles);
    }).catch(function (err) {
      res.status(500).json({ error: err.message });
    })
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function (req, res) {
  db.Article.findOne({ _id: req.params.id })
    .populate("notes")
    .then(function (dbResults) {
      res.json(dbResults);
    }).catch(function (err) {
      res.status(500).json({ error: err.message });
    })
});

app.post("/saveArticle", function (req, res) {
  console.log("req.body", req.body.saveArt);
  //5cffd5b3beb9e90fd021559d {_id:{$in:req.body.saveArt}}
  db.Article.find({ _id: { $in: req.body.saveArt } })
    .populate("notes")
    .then(function (dbArticles) {
      res.json(dbArticles);
    }).catch(function (err) {
      res.status(500).json({ error: err.message });
    })
})



app.get("/notes", function (req, res) {
  db.Notes.find()
    .then(function (dbNotes) {
      res.json(dbNotes);
    }).catch(function (err) {
      res.status(500).json({ error: err.message });
    })
});


app.post("/notes/comments/:id", function (req, res) {
  db.Notes.create(req.body)
    .then(function (dbNote) {
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { $push: { notes: dbNote._id } }, { new: true }).populate("Notes")
    }).then(function (dbArticle) {
      res.json(dbArticle);
    })
})


app.get("/note/delete/:id", function (req, res) {
  console.log("req.params.id", req.params.id);
  db.Notes.deleteOne({ _id: req.params.id })
    .then(function (data) {
      console.log("data:", data);
      res.json(data);
    }).catch(function (err) {
      res.json({ error: err.message });
    })
})


//users route

app.get("/users", function (req, res) {
  db.Users.find()
    .then(function (dbusers) {
      res.json(dbusers)
    })
})

app.get("/users/:id", function (req, res) {

  db.Users.findOne({ _id: req.params.id })
    .then(function (dbResults) {
      res.json(dbResults);
    }).catch(function (err) {
      res.status(500).json({ error: err.message });
    })
})

app.post("/users", function (req, res) {
  db.Users.create(req.body)
    .then(function (dbUser) {
      res.json(dbUser);
    }).catch(function (error) {
      res.json({ error: error.message });
    })

})

// Start the server
app.listen(PORT, function () {
  console.log("App running on port " + PORT + "!");
});
