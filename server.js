var express = require('express');

var app = express();

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use(express.static(__dirname));

var router = express.Router();

router.get('/', function(req, res) {
    res.end('')
});

app.use(router);

app.listen(3000);