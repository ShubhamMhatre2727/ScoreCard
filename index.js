const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const PORT = 3000;
const net = require('os').networkInterfaces();

// =====================================================================================
// sqlite3 database configuration
const sqlite3 = require('sqlite3')
const db = new sqlite3.Database('./database')

// =====================================================================================
// Using a function to set default app path
const path = require('path');
const { error } = require('console');
const { emit } = require('process');
function getDir() {
    if (process.pkg) {
        return path.resolve(process.execPath + "/..");
    } else {
        return path.join(require.main ? require.main.path : process.cwd());
    }
  }

// =====================================================================================
// data initialization
var score=[];
var playingTeam = {};

function updateDB(){
    getMatchTitle();
    getTeamData();
}

function getMatchTitle(){
    db.all('SELECT * FROM teams', (error, teams)=>{
        if(error) console.log(error);
        else{
            io.emit('match title', `${teams[0]['name'].toUpperCase()}vs${teams[1]['name'].toUpperCase()}`)
        }
    })
}

function getTeamData(){
    db.each('SELECT * FROM teams WHERE batting=true',(error, res)=>{
        if(error) console.log(error);
        if(res['runs'] == null){
            // 1st inning
            playingTeam = res;
            console.log('1st ');
            io.emit('teams data', {inning: '1st', playingTeam: res});
            updateScore();
        }
        else{
            db.each('SELECT * FROM teams WHERE batting=false',(error, res)=>{
                if(error) console.log(error);
                if(res['runs'] == null && res['target']){
                    // 2nd inning
                    playingTeam = res;
                    console.log('2nd ');
                    io.emit('teams data', {inning: '2nd', playingTeam: res});
                    updateScore();
                }
                else if(res['runs'] && res['target']){
                    checkWinner();
                }
            })
        }
    })
}

function updateScore(){
    db.all('SELECT * FROM score WHERE team=?', playingTeam['name'],(error, rows)=>{
        if(error) console.log(error);
        if(rows){
            score = Object.values(rows);
            io.emit('score update', score);
            
            scoreData();
        }
    })
}

function scoreData(){
    var scoreData = {};
    db.each("SELECT SUM(runs) as runs FROM score WHERE runs != 'wicket' AND team=?", playingTeam['name'], (error, res)=>{
        if(error) console.log(error);
        scoreData['runs'] = res['runs'];

        db.each("SELECT COUNT(*) as extra FROM score WHERE ball IN('nb', 'wd') AND team=?", playingTeam['name'], (error, res)=>{
            if(error) console.log(error);
            scoreData['extra'] = res['extra'];

            db.each("SELECT COUNT(*) as wickets FROM score WHERE runs = 'wicket' AND team=?", playingTeam['name'],(error, res)=>{
                if(error) console.log(error);
                scoreData['wickets'] = res['wickets']
                io.emit('scoreData', scoreData)
            })
        })
    })

    db.wait(()=> playersScore());
}

function playersScore(){
    if(score.length<1) return;
    var p1={}, p2={};
    db.all("SELECT runs,count(*) as count FROM score WHERE player1=? AND striker=1 AND ball NOT IN('wd', 'nb') AND team=? GROUP BY runs", score[score.length-1]['player1'], playingTeam['name'], (error, res)=>{
        if(error) console.log(error);
        res.forEach((val)=>{
            p1[val['runs']] = val['count'];
        })


        db.all("SELECT runs,count(*) as count FROM score WHERE player2=? AND striker=2 AND ball NOT IN('wd', 'nb') AND team=? GROUP BY runs", score[score.length-1]['player2'], playingTeam['name'], (error, res)=>{
            if(error) console.log(error);
            res.forEach((val)=>{
                p2[val['runs']] = val['count'];
            })
            io.emit('playersScore', ({p1, p2}));
        })
    })

    db.wait(()=> overBalls())
}


function overBalls(){
    var overs = [];
    console.log(playingTeam['name']);
        db.each("SELECT MAX(over) as max FROM score WHERE team=?",playingTeam['name'], (error, res)=>{
            if(error) console.log(error);
            db.each("SELECT ball, runs FROM score WHERE team=? AND over = ?",playingTeam['name'], res['max'], (error, res)=>{
                if(error) console.log(error);
                else{
                    if(res['ball']=='wd'){
                        overs.push(res['ball'])
                    }else if(res['ball']=='nb'){
                        overs.push(res['ball']+res['runs'])
                    }else if(res['runs']=='wicket'){
                        overs.push('W')
                    }else{
                        overs.push(res['runs'])
                    }

                    io.emit('get bowler name')
                }
            })
        })
        
        db.wait(()=> io.emit('overData', overs));
}

function bowlerData(bowler){
    console.log(bowler);
    db.each("SELECT SUM(runs) as runs, COUNT(*) as balls FROM score WHERE bowler=?", bowler, (error, res)=>{
        if(error) console.log(error);
        var runs = res['runs'];
        var balls = res['balls'];
        db.each("SELECT COUNT(*) as extra FROM score WHERE bowler=? AND ball IN('wd', 'nb')", bowler, (error, res)=>{
            if(error) console.log(error);
            var extra = res['extra'];
            db.each("SELECT COUNT(*) as wickets FROM score WHERE runs='wicket' AND bowler=?", bowler, (error, res)=>{
                if(error) console.log(error);
                var wickets = res['wickets'];

                io.emit('bowler data', ({
                    name: bowler,
                    runs: runs+extra,
                    wickets: wickets,
                    balls: (parseInt((balls-extra)/6)+"."+((balls-extra)%6))
                }))
            })
        })
    })
}

function checkWinner(){
    // 1st row team batted inning 1
    // 2nd row team batted inning 2
    db.all('SELECT * FROM teams ORDER BY batting DESC',(error, teams)=>{
        if(teams[1]['runs'] == teams[0]['runs']){
            io.emit('match result', 'MATCH DRAW');
        }
        else if(teams[1]['runs'] >= teams[1]['target'] ){
            io.emit('match result', `${teams[1]['name']} WIN`);
        }
        else if(teams[1]['runs'] < teams[0]['runs']){
            io.emit('match result', `${teams[0]['name']} WIN by ${teams[1]['target']-teams[1]['runs']} runs`);
        }
    })
}


// =====================================================================================
app.use(express.static('src'));
app.get('/',(req, res)=>{
    // score card
    return res.sendFile(getDir() + "/src/score_dashboard.html")
})

app.get('/loader', (req, res)=>{
    // scorer
    return res.sendFile(getDir() + "/src/loader.html")
})

app.get('/admin', (req, res)=>{
    // scorer
    return res.sendFile(getDir() + "/src/admin.html")
})

server.listen(PORT, ()=>{
    console.log(`Listening on http://localhost:${PORT}`);
    const _net = net['Wi-Fi'][1]['address'];
    console.log(`Network: http://${_net}:${PORT}`);
    // console.log(net);
})

// ======================================================================================
// Socket.io

io.on('connection', (socket)=>{

    socket.on('upload teams data',(data)=>{
        db.run('CREATE TABLE IF NOT EXISTS teams(id int primary key not null, name varchar(20), toss boolean, batting boolean, overs int, oversPlayed int, runs int, target int)', (error)=>{
            if(error) console.log(error);
            else{
                db.run('INSERT INTO teams values (?,?,?,?,?,?,?,?)', data['team1'],(error)=>{
                    if(error) console.log('insert team :'+error);

                    db.run('INSERT INTO teams values (?,?,?,?,?,?,?,?)', data['team2'],(error)=>{
                        if(error) console.log('insert team :'+error);
    
                        db.run('CREATE TABLE IF NOT EXISTS score(id integer primary key autoincrement ,team varchar(20), over int, ball varchar(5), player1 varchar(20), player2 varchar(20), bowler varchar(20), runs varchar(10), striker int, strikeChanged boolean, wicket int)',(error)=>{
                            if(error) console.log(error);
                            io.emit('go to admin');
                        });
                    })
                })
            }
        })
    })

    socket.on('get current score',()=>{
        updateDB();
    })

    socket.on('refresh',()=> io.emit('refresh'))

    socket.on('insert score', (data)=>{
        var strikeChange = false;
        if(data[6] == 1 || data[6] == 3){
            strikeChange = !strikeChange;
        }
        if(data[2] == 6){
            strikeChange = !strikeChange;
        }

        data[8] = strikeChange;
        db.run("INSERT INTO score VALUES(null, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",data,(error, result)=>{
            if(error) console.log("insert error : "+error);
            updateDB();
        })
    })


    socket.on('end inning',(inningData)=>{
        db.run('UPDATE teams SET runs=?, oversPlayed=? WHERE batting = true', (inningData), (error)=>{
            if(error) console.log(error);
            db.run('UPDATE teams SET target=? WHERE batting = false', (inningData[0]+1), (error)=>{
                if(error) console.log(error);
                updateDB();
            })
        })
    })

    socket.on('end match', (inningData)=>{
        db.run('UPDATE teams SET runs=?, oversPlayed=? WHERE batting = false', (inningData), (error)=>{
            if(error) console.log(error);
            checkWinner();
        })
    })


    socket.on('popBall',()=>{
        db.run('DELETE FROM score WHERE id = (SELECT MAX(id) FROM score) AND team=?', playingTeam['name'],(error, res)=>{
            if(error) console.log(error);
            else{
                updateDB();
            }
        })
    })

    socket.on('load names', (names)=>{
        io.emit('load names', (names))
        io.emit('get bowler name')
    })

    socket.on('bowler name',(bowler)=>{
        bowlerData(bowler);
    })

    socket.on('destroy tables',()=>{
        // destroys thee database table and refresh the page 
            db.run('DROP TABLE teams', (error, result)=>{
                if(error) console.log(error);
                else{
                    db.run('DROP TABLE score', (error)=>{
                        if(error) console.log(error);
                        io.emit('go to loader')
                    })
                }
            })
    })

    // socket.on('clear score',()=>{
    //     destroyScore();
    // })
})