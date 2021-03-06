const express = require("express");
const next = require("next");

const port = parseInt(process.env.PORT, 10) || 3011;
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const cors = require('cors');

let mongoUrl;
let locatorScale = parseInt(1000000000);

let mongoName;

if (typeof process.env.MONGODB_URL === "undefined") {
  mongoUrl = "mongodb://localhost:27017/"; //  dev database server
  mongoName = "okconceptdevdb";
} else {
  mongoUrl = process.env.MONGODB_URL; //  production database server
  mongoName = "";
}

const mongoAddress = mongoUrl + mongoName;

const users_collection = "redwooddevcollection";
let subscriptions_collection = "okconceptdevcollection";

var MongoClient = require("mongodb").MongoClient;

function postDataWildcard(
  db,
  table,
  tuple,
  objval,
  objkey = "description",
  newVal = "__"
) {
  console.log("trying to replace prop " + objkey);
  console.log("from " + objval + " to " + newVal);
  let collectionName = table;

  MongoClient.connect(mongoAddress, function(err, db) {
    let collection = db.collection(`${collectionName}`);
    let record = collection;

    collection.updateOne(
      { [objkey]: objval },
      { $set: { [objkey]: newVal } },
      function(err, result) {
        console.log("Updated the document");
        console.log(result);
      }
    );
  });
}

function deleteDataWildcard(
  db,
  table,
  tuple,
  objval,
  objkey = "description",
  newVal = "__"
) {
  console.log(table, tuple);
  let collectionName = table;
  console.log("to delete: " + tuple);
  console.log("from " + table);
  MongoClient.connect(mongoAddress, function(err, db) {
    let collection = db.collection(`${collectionName}`);
    console.log(collection);
    collection.deleteOne({ locator: parseInt(tuple) }, function(err, result) {
      console.log("Updated the document - deleted");
    });
  });
  console.log("record removed (💣🤷)");
}

MongoClient.connect(mongoAddress, function(err, db) {
  if (err) {
    console.log(err);
    throw err;
  }
  db.collection(subscriptions_collection)
    .find()
    .toArray(function(err, result) {
      if (err) {
        console.log(err);
      }
    });
});

app.prepare().then(() => {
  const server = express();
  server.use(cors())

  server.get("/a", (req, res) => {
    return app.render(req, res, "/a", req.query);
  });

  server.get("/b", (req, res) => {
    return app.render(req, res, "/b", req.query);
  });

  server.get("/posts/:id", (req, res) => {
    return app.render(req, res, "/posts", { id: req.params.id });
  });

  var apiDataDB1 = [{ data: "default" }];

  server.get("/api/1/getdbdata/db/:db/object/:obj/tuple/:tuple", function(
    req,
    res
  ) {
    MongoClient.connect(mongoAddress, function(err, db) {
      if (err) {
        console.log(err);
        throw err;
      }
      console.log("looking up data for tuple " + req.params.tuple);
      db.collection(req.params.obj)
        .find({ locator: { $eq: parseInt(req.params.tuple) } })
        .toArray(function(err, result) {
          console.log(
            "result of query for: " +
              req.params.db +
              " | " +
              req.params.obj +
              " | " +
              req.params.tuple
          );
          console.log(result);
          res.send(result);
        });
    });
  });

  server.get("/api/1/getdbdata/db/:db/object/:obj", (req, res) => {
    MongoClient.connect(mongoAddress, function(err, db) {
      if (err) {
        console.log(err);
        throw err;
      }
      console.log("looking up data for table " + req.params.obj);
      db.collection(req.params.obj)
        .find()
        .toArray(function(err, result) {
          console.log(
            "result of query for: " + req.params.db + " | " + req.params.obj
          );
          console.log(result);
          res.send(result);
        });
    });
  });

  server.post(
    "/api/1/saveobjectdata/db/:db/obj/:obj/newdata/:newdata",
    (req, res) => {
      MongoClient.connect(mongoAddress, function(err, db) {
        if (err) {
          console.log(err);
          throw err;
        } else {
          console.log("about to add tuple");
          console.log(req.params.newdata);
          let serverObject = JSON.parse(req.params.newdata);
          serverObject = JSON.parse(serverObject);
          console.log(serverObject);

          let dbObject = Object.assign(serverObject, {
            locator: Math.floor(Math.random() * locatorScale + 1),
            created_at_time: Date.now()
          });

          console.log("tuple to save");
          console.log(dbObject);
          db.collection(req.params.obj).insertOne(dbObject);
        }
      });
      console.log("data that should have been added " + req.params.newdata);
      res.send(Object.assign({}, { Response: "ok - POST save object data" }));
    }
  );

  server.post(
    "/api/1/updatedata/db/:db/object/:obj/objprop/:objprop/objkey/:objkey/newval/:newval/tuple/:tuple",
    (req, res) => {
      console.log("running update POST route");
      console.log("obj: " + req.params.obj);

      postDataWildcard(
        req.params.db,
        req.params.obj,
        req.params.tuple,
        req.params.objprop,
        req.params.objkey,
        req.params.newval
      );
      res.send(Object.assign({}, { Response: "ok - POST update" }));
    }
  );

  server.post(
    "/api/1/deletedata/db/:db/object/:obj/tuple/:tuple",
    (req, res) => {
      console.log("running (simple) delete POST route");
      console.log("obj: " + req.params.obj);

      deleteDataWildcard(
        req.params.db,
        req.params.obj,
        req.params.tuple,
        null,
        null,
        null
      ); //  the last 3 parameters can be null
      res.send(Object.assign({}, { Response: "ok - POST update (remove)" }));
    }
  );

  server.post(
    "/api/1/saveobjectdatashallow/db/:db/obj/:obj/newdata/:newdata",
    (req, res) => {
      console.log("about to add tuple [shallow] - " + req.params.db + " | " + req.params.obj);
      MongoClient.connect(mongoAddress, function(err, db) {
        if (err) {
          console.log(err);
          throw err;
        } else {
          console.log("about to add tuple");
          console.log(req.params.newdata);
          let serverObject = JSON.parse(req.params.newdata);
          console.log(serverObject);

          let dbObject = Object.assign(serverObject, {
            locator: Math.floor(Math.random() * locatorScale + 1),
            created_at_time: Date.now()
          });

          console.log("tuple to save");
          console.log(dbObject);
          db.collection(req.params.obj).insertOne(dbObject);
        }
      });
      console.log("data that should have been added " + req.params.newdata);
      res.send(Object.assign({}, { Response: "ok - POST save object data (shallow)" }));
    }
  );

  server.post(
    "/api/1.6/updatedata/db/:db/object/:obj/objprop/:objprop/objkey/:objkey/newval/:newval/tuple/:tuple",
    (req, res) => {
      console.log("running update POST route (v1.6)");
      console.log("obj: " + req.params.obj);

      var someStr = decodeURIComponent(req.params.objprop);
      let oldVal = someStr.replace(/['"]+/g, '');
      console.log("old value: " + oldVal);

      var someOtherStr = decodeURIComponent(req.params.newval);
      let newVal = someOtherStr.replace(/['"]+/g, '');
      console.log("new value: " + newVal);

        postDataWildcard(
          req.params.db,
          req.params.obj,
          req.params.tuple,
          oldVal,
          req.params.objkey,
          newVal
        );

      res.send(Object.assign({}, { Response: "ok - POST update" }));
    }
  );

  server.get("*", (req, res) => {
    return handle(req, res);
  });

  server.listen(port, err => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});
