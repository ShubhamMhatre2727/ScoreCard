const socket = io.connect()

socket.emit('get current score');

socket.on('match title', (title)=>{
    document.getElementById('title').innerText = "#"+title;
})

var batter1, batter2, bowler;
var striker, over, balls;

socket.on('score update', (rows)=>{
    // getting players name
    batter1 = rows[rows.length - 1]['player1'];
    batter2 = rows[rows.length - 1]['player2'];
    bowler = rows[rows.length - 1]['bowler'];

    // finding who's on strike
    if(rows[rows.length-1]['strikeChanged'] == true){
        if(rows[rows.length-1]['striker']==1)
            // striker = 2;
            batter2 += "*"
        else
            // striker = 1;
            batter1 += "*"
    }else{
        if(rows[rows.length-1]['striker']==1)
            // striker = 1;
            batter1 += "*"
        else
            // striker = 2;
            batter2 += "*"
    }

    // finding ongoing over and ball
    over = rows[rows.length - 1]['over'];
    var idx= rows.length - 1;
    while(rows[idx]['ball'] == 'wd' || rows[idx]['ball'] == 'nb') idx--;
    balls = Number(rows[idx]['ball']);

    // setting over and ball
    document.getElementById('over').innerText = over + "."+ balls;
})

socket.on('scoreData', (scoreData)=>{
    document.getElementById('run-wicket').innerText = scoreData['runs']+scoreData['extra'] + "-" + scoreData['wickets'];
    document.getElementById('toss-rr').innerHTML = `<h4>CRR</h4><h3>${parseFloat((scoreData['runs']+scoreData['extra'])/(over + 1)).toFixed(2)}</h3>`
})

socket.on('playersScore', ({p1, p2})=>{
    // calculating players runs
    var p1Runs = (p1['1']?p1['1']:0) + (p1['2']?p1['2']*2:0) + (p1['3']?p1['3']*3:0) + (p1['4']?p1['4']*4:0) + (p1['6']?p1['6']*6:0);
    var p1Balls = (p1['0']?p1['0']:0) + (p1['1']?p1['1']:0) + (p1['2']?p1['2']:0) + (p1['3']?p1['3']:0) + (p1['4']?p1['4']:0) + (p1['6']?p1['6']:0);
    var p2Runs = (p2[1]?p2[1]:0) + (p2[2]?p2[2]*2:0) + (p2[3]?p2[3]*3:0) + (p2[4]?p2[4]*4:0) + (p2[6]?p2[6]*6:0);
    var p2Balls = (p2['0']?p2['0']:0) + (p2['1']?p2['1']:0) + (p2['2']?p2['2']:0) + (p2['3']?p2['3']:0) + (p2['4']?p2['4']:0) + (p2['6']?p2['6']:0);

    // setting player name, their strike, runs and balls
    document.getElementById('player1').innerHTML = `<h3 id="player1Name">${batter1}</h3> <span><h2>${p1Runs}</h2><p>${p1Balls}</p></span>`
    document.getElementById('player2').innerHTML = `<h3 id="player2Name">${batter2}</h3> <span><h2>${p2Runs}</h2><p>${p2Balls}</p></span>`
})

socket.on('overData', (balls)=>{
    var str = '';
    balls.forEach((ball)=>{
        if(ball == 'wd')
            str += `<p class="wide"><strong>${ball}</strong></p>`
        else if(ball == '4' || ball == '6')
            str += `<p class="boundary"><strong>${ball}</strong></p>`
        else if(ball == 'W')
            str += `<p class="wicket"><strong>${ball}</strong></p>`
        else if(ball.includes('nb'))
            str += `<p class="no"><strong>${ball}</strong></p>`
        else
            str += `<p><strong>${ball}</strong></p>`
    })

    document.getElementById('balls').innerHTML = str;
})

socket.on('load names', (names)=>{
    console.log(names);
    document.getElementById('player1Name').innerText = names['player1']
    document.getElementById('player2Name').innerText = names['player2']
    document.getElementById('bowlerName').innerText = names['bowler']
})

socket.on('refresh',()=> document.location.reload())

socket.on('match result', (res)=>{
    document.getElementById('title').innerText = res;
})

socket.on('bowler data', (bowlerData)=>{
    console.log(bowlerData);
    document.getElementById('bowler').innerHTML = `<h3 >${bowlerData['name']}</h3> <span><h3>${bowlerData['wickets']} - ${bowlerData['runs']}</h3><p>${bowlerData['balls']}</p></span>`
})