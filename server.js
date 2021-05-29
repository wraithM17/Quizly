console.log('[+] server.js running');
const express = require('express');
const mongoose = require('mongoose');
const {v4:uuid} = require('uuid');
const path = require('path');
const auth = require('./auth');
const utils = require('./utils');
const db = require('./db');
require('dotenv').config();
var server;



const app = express();
const PORT = process.env.PORT || 2003;


const DATABASE = {
    url:process.env.DB_URL
}

mongoose.connect(DATABASE.url,{useNewUrlParser:true,useUnifiedTopology:true})
    .then((result) => {
        console.log('[+] Connected to database');
        server = app.listen(PORT,() => {
            console.log('[+] Server Online');
        });

    })
    .catch((error) => {
        console.log('[-] Failed connecting to database');
        console.log(error);
    });



const PATH = {
    public:path.join(__dirname,'public'),
    routes:path.join(__dirname,'routes')
};


app.use(express.json());
app.use(express.static(PATH.public));




// DATABASE ROUTES
const QuizData = require('./models/quizdata');
const { resolveSoa } = require('dns');


app.post('/create-quiz',async(req,res) => {
    let data = req.body;
    let checkCreatorKey = await auth.checkCreatorKey(data);
    
    if (checkCreatorKey){
        let checkQuiz = await auth.checkQuizItem(data);
        if (checkQuiz[0]){
            data = await auth.alterQuizItem(data);

            let quizData = new QuizData({
                difficulty:data.difficulty,
                question:data.question,
                answer:data.answer,
                option1:data.option1,
                option2:data.option2,
                option3:data.option3,
                author:checkCreatorKey.creatorName
            });

            quizData.save()
                .then(result => {
                    console.log('[-][create-quiz] New quiz item created');
                    res.json({
                        'message':'Published submitted quiz item',
                        'success':true,
                        'validKey':true
                    });
                })
                .catch(error => {
                    console.log(error);
                    console.log('[x][create-quiz] Error in publishing a quiz item to database');
                    res.json({
                        'message':'Database error in publishing quiz item',
                        'success':false,
                        'validKey':true
                    });
                })

        }
        else if (!checkQuiz[0]){
            let reason = checkQuiz[1];
            res.send({
                'message':reason,
                'success':false,
                'validKey':true
            });
        }
    }
    else {
        console.log('[x][create-quiz] Someone used an invalid creator key');
        res.json({
            'message':'Creator key invalid',
            'success':false,
            'validKey':false
        });
    }

});




app.get('/fetch/:amt',(req,res) => {
    let amount = req.params.amt;
    console.log(`[-] GET : /fetch/${amount}`);

    QuizData.countDocuments().exec((error,count) => {
        let randList = utils.generateRandomList(5,count);
        let collections = [];
        let c = 0;
        for (x of randList){
            QuizData.findOne().skip(x).exec((error,data) => {
                c++;
                collections.push(data);
                if (c == amount){
                
                    res.send(collections);
                }

            });

        }
    });
    
});


app.get('/creator/new',async (req,res) => {
    console.log('[-] GET : /creator/new');
    let key = req.query.key;
    let author = req.query.author;

    if (key && author){
        console.log(`New Creator : [+] ${key} : ${author}`);
        let sendObj = {
            key:key,
            creatorName:author
        }
        let newCreator = await db.newCreator(sendObj);
        sendObj['success'] = newCreator;
        res.json(sendObj);    
    }
    else {
        res.send('Invalid query');
    }


});











app.get('/create-quiz',(req,res) => {
    res.sendFile('create.html',{root:PATH.public});
    console.log('[-] GET : create');
});

app.get('/quiz',(req,res) => {
    res.sendFile('quiz.html',{root:PATH.public});
    console.log('[-] GET : quiz');
}); 

app.get('/utils/db-question-count',(req,res) => {
    QuizData.countDocuments().exec((error,count) => {
        res.json({'questionCount':count});
    });
});

app.get('/questions-exhausted',(req,res) => {
    res.sendFile('questions-exhausted.html',{root:PATH.public});
    console.log('[-] GET : questions-exhausted');    
});


app.get('/',(req,res) => {
    res.send('Welcome to Quizly! Site under development<br><br><a href="/create-quiz">Create Quiz</a><br><br><a href="/quiz">Play quiz</a><br>');
    console.log('[-] GET : home');
});
