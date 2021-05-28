console.log('[+] server.js running');
const express = require('express');
const mongoose = require('mongoose');
const {v4:uuid} = require('uuid');
const path = require('path');
const auth = require('./auth');
const utils = require('./utils');
require('dotenv').config();
var server;



const app = express();
const PORT = process.env.PORT || 2003;


const DATABASE = {
    url:process.env.DB_URL
}

global.KEYS = {};

mongoose.connect(DATABASE.url,{useNewUrlParser:true,useUnifiedTopology:true})
    .then((result) => {
        console.log('[+] Connected to database');
        server = app.listen(PORT,() => {
            console.log('[+] Server Online');
        });
        KEYS[process.env.CREATOR_1] = 'wraithM17';
        KEYS[process.env.CREATOR_2] = 'Anonymous'; 

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



app.post('/create-quiz',(req,res) => {
   let data = req.body;
   
    if (auth.checkCreatorKey(data)){
        let checkQuiz = auth.checkQuizItem(data);
        if (checkQuiz[0] == true){
            data = auth.alterQuizItem(data);

            let quizData = new QuizData({
                difficulty:data.difficulty,
                question:data.question,
                answer:data.answer,
                option1:data.option1,
                option2:data.option2,
                option3:data.option3,
                author:KEYS[data.key]
            });
 
            quizData.save()
                .then(result => {

                    console.log('[-][create-quiz] QUIZ : New item created');
                    res.send({
                        'message':'Published submitted quiz item',
                        'success':true
                    });

                    
                })
                .catch(error => {
 
                    console.log('[x][create-quiz] Error in publishing a quiz item to database');
                    res.send({
                        'message':'Database error in publishing quiz item',
                        'success':false
                    });

                });


        }
        else {
            let reason = checkQuiz[1];
            res.send({
                'message':reason,
                'success':false
            });
        };


    }
    else {
        console.log('[x][create-quiz] Creator key invalid');
        res.send({
            'message':'Creator key invalid',
            'success':false
        });
    };

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
