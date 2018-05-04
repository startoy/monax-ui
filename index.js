/* require package */
const fs		= require('fs');
const contracts         = require('@monax/legacy-contracts');
const burrowModule      = require('@monax/legacy-db');
const express           = require('express')                          /* server provider, easy way to create node server with url handle */
const request           = require('request')                          /* make a http request to specific url */
const bodyParser        = require('body-parser')

        /* variable */
_burrowURL        	= "http://0.0.0.0:1337";
_burrowrpcURL     	= "http://0.0.0.0:1337/rpc"
_keysURL          	= "http://0.0.0.0:4767";

        /* read config file */
var address             = require('./epm.output.json').deploySmart;
var ABI                 = JSON.parse(fs.readFileSync('./abi/' + address, 'utf8'));
var accountData         = require('/home/ubuntu/.monax/chains/multichain/accounts.json');

        /* SHORT (ใช้ devpipe ไม่ได้) */
// var contractManager     = contracts.newContractManagerDev(burrowrpcURL, accountData.multichain_full_000); 

        /* FULL (newContractManagerDev)  */
var burrow 		= burrowModule.createInstance(_burrowrpcURL);                           /* legacy-db */
var tx                  = burrow.txs();                                                         /* transaction burrow */                                   
var pipe 		= new contracts.pipes.DevPipe(burrow, accountData.multichain_full_000); /* legacy-contract */
var contractManager 	= contracts.newContractManager(pipe);
var myContract          = contractManager.newContractFactory(ABI).at(address);

        /* express js */
const app       	= express();
const port      	= process.env.PORT || 8080;
const _url              = "http://0.0.0.0:" + port;
const _url_acc          = _url + "/acc";
const _url_tx           = _url + "/tx";

        /* for .post request */
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
        extended: true
}));

var account = express.Router();
var tx      = express.Router();

        /****************************************************************
         ******** ACCOUNT 
         *****************************************************************/

        account.use( (req, res, next) => {
                console.log("Entering the account acc -> next()");
                next();
        });

        account.get('/', (req, res) => {
                res.json({ message : "this is first page of api"});
        });

        /*      /acc/accounts                    GET     get all accounts
                /acc/accounts                    POST    create accounts
                /acc/accounts/:acc_id            GET     get account by id
                /acc/accounts/:acc_id            PUT     update account by id
                /acc/accounts/:acc_id            DELETE  delete account by id
        */

        account.route('/gets')
                .get( (req, res) => {
                        res.json(pipe.listAccount());
                })


        account.route('/create')
                .post((req, res) => {
                        //call create account
                        let options = { url : _url_acc + '/generate' };
                        request.get(options, (err, res2, body) => {
                                if(!err && res2.statusCode == 200) {
                                        if(addAccount(res2)){
                                                console.log("success add account");
                                                res.json({ message : "success", status : 1});
                                        }else{
                                                console.log("failed add account");
                                                res.json({ message : "failed", status : 0});
                                        }
                                }else{
                                        console.log("error on request to generate account");
                                        res.json( { message : "error on request to generate account", status : 0} );
                                }
                        });
                });
        
        account.route('/generate')
                .get((req, res) => {
                        let options = { url: _burrowURL + '/' + 'unsafe/pa_generator'};
                        request.get(options, (error , res2, body) => {
                            if (!error && res2.statusCode == 200) {
                                let obj     = JSON.parse(body);
                                var address = obj.address;
                                var pub     = obj.pub_key[1];
                                var pri     = obj.priv_key[1];
                                let newDataObj = {address : address, pubKey : pub, privKey : pri};
                                res.json(newDataObj);
                            }else{
                                console.log(error);
                                res.json({ error : "something went wrong on generate account"});
                            }
                        });
                });

        
        /****************************************************************
         ******** TRANSACTION 
         *****************************************************************/

        tx.use( (req, res, next) => {
                console.log("Entering the transaction acc -> next()");
                next();
        });

        tx.get('/', (req, res) => {
                res.json({ message : "this is first page of transaction api"});
        });

        /*      /tx/sendtoken                   POST    send token by address with privkey and amount
        */
        tx.route('/sendtoken')
                .get( (req, res) => {
                        res.json({ message : "use POST instead."});
                })
                .post((req, res) => {
                        /* FIXME: no indicator if is error or not */
                        tx.sendAndHold( req.body.privKey, req.body.address, req.body.amt, globalCallback() );
                        res.json({ message : "the transaction may be in queue for validate, you can quit this page for now"});
                })


        /****************************************************************
         ******** UTILITY 
         *****************************************************************/

        function addAccount(jsonObj){
                // let newAccount = { address : addr, pubKey : pubk, privKey : prik };
                return pipe.addAccount(jsonObj);
        }

        function globalCallback(){
                console.log("Operated...");
        }

/* All account request prefix with "/acc" */
app.use('/acc', account);
/* All transaction request prefix with "/tx" */
app.use('/tx', tx);

app.listen(port, (err) => {
        if (err) {
                return console.log('Fail to intial server:', err);
        } else {
                console.log('server' + ' is listening on port ' + port );
        }
});
