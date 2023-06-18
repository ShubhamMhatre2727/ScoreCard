const socket = io.connect()

socket.emit('get current score');

socket.on('match title', (teams)=>{
    document.getElementById('left-block').innerText = teams[0];
    document.getElementById('right-block').innerText = teams[1];
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
    document.getElementById('match-status').innerHTML = ` RR ${parseFloat((scoreData['runs']+scoreData['extra'])/(over + 1)).toFixed(2)}`
})

socket.on('playersScore', ({p1, p2})=>{
    // calculating players runs
    var p1Runs = (p1['1']?p1['1']:0) + (p1['2']?p1['2']*2:0) + (p1['3']?p1['3']*3:0) + (p1['4']?p1['4']*4:0) + (p1['6']?p1['6']*6:0);
    var p1Balls = (p1['0']?p1['0']:0) + (p1['1']?p1['1']:0) + (p1['2']?p1['2']:0) + (p1['3']?p1['3']:0) + (p1['4']?p1['4']:0) + (p1['6']?p1['6']:0);
    var p2Runs = (p2[1]?p2[1]:0) + (p2[2]?p2[2]*2:0) + (p2[3]?p2[3]*3:0) + (p2[4]?p2[4]*4:0) + (p2[6]?p2[6]*6:0);
    var p2Balls = (p2['0']?p2['0']:0) + (p2['1']?p2['1']:0) + (p2['2']?p2['2']:0) + (p2['3']?p2['3']:0) + (p2['4']?p2['4']:0) + (p2['6']?p2['6']:0);

    // setting player name, their strike, runs and balls
    document.getElementById('player1').innerHTML = `<h3 class="player">${batter1}</h3><h3 class="status">${p1Runs} <span>${p1Balls}</span></h3>`
    document.getElementById('player2').innerHTML = `<h3 class="player">${batter2}</h3><h3 class="status">${p2Runs} <span>${p2Balls}</span></h3>`
})

socket.on('overData', (balls)=>{
    var str = '';
    balls.forEach((ball)=>{
        str += `<div class="ball">${ball}</div>`
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
    document.getElementById('match-status').innerText = res;
})

socket.on('bowler data', (bowlerData)=>{
    console.log(bowlerData);
    document.getElementById('bowler').innerHTML = `<h3 class="bowlerName" id="bowlerName">${bowlerData['name']}</h3><h3 class="status">${bowlerData['wickets']} - ${bowlerData['runs']}<span> ${bowlerData['balls']}</span></h3>`
})

socket.on('playing team', (playingTeam)=>{
    console.log(playingTeam);
    if(playingTeam['batting']){
        document.getElementById('match-inning').innerText = '1st'
    }else{
        document.getElementById('match-inning').innerText = '2nd'
    }
    
    if(playingTeam['target']){
        document.getElementById('match-status').innerText = "TARGET : "+playingTeam['target']
    }

    document.getElementById('teamName').innerText = playingTeam['name'].substring(0,3).toUpperCase()

})


socket.on('hide score',()=>{
    const el = document.getElementById('body')
    if(window.getComputedStyle(el).visibility !== "hidden"){
        el.style.visibility = 'hidden';
    }else{
        el.style.visibility = 'visible';
    }
})

socket.on('keep score', ()=>{
    if(window.getComputedStyle(document.getElementById('background')).visibility !== "hidden"){
        document.getElementById('background').style.visibility = 'hidden'
        document.getElementById('side-left').style.visibility = 'hidden'
        document.getElementById('side-right').style.visibility = 'hidden'
        document.getElementById('left-block').style.visibility = 'hidden'
        document.getElementById('right-block').style.visibility = 'hidden'
    }else{
        document.getElementById('background').style.visibility = 'visible'
        document.getElementById('side-left').style.visibility = 'visible'
        document.getElementById('side-right').style.visibility = 'visible'
        document.getElementById('left-block').style.visibility = 'visible'
        document.getElementById('right-block').style.visibility = 'visible'
    }
})