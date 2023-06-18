const socket = io.connect()
var over=0, balls=1;
var player1, player2, bowler, striker=1;
var lastBall = [];
var runs=0, extra=0;
var wickets = 0;
var playingTeam;
var inning;

// <!-- getting current score -->
socket.emit('get current score');
socket.emit('refresh');

socket.on('teams data', (teamsData)=>{
    playingTeam = teamsData['playingTeam'];
    inning = teamsData['inning'];
    document.getElementById('match').innerText = `${inning} Inning`;
    console.log(playingTeam);
})

socket.on('overData', (overs)=>{
    console.log(overs);
    document.getElementById('balls').innerHTML = overs;
})

socket.on('scoreData', (scoreData)=>{
    runs = scoreData['runs'];
    extra = scoreData['extra'];
    wickets = scoreData['wickets'];
    document.getElementById('teamData').innerText = `${playingTeam['name']} : ${scoreData['runs']+scoreData['extra']} / ${scoreData['wickets']} (${over}.${balls-1})`

    document.getElementById('target-runRate').innerText = (playingTeam['target'])?`TARGET: ${playingTeam['target']}, CRR : ${parseFloat((scoreData['runs']+scoreData['extra'])/(over + 1)).toFixed(2)}`:`CRR : ${parseFloat((scoreData['runs']+scoreData['extra'])/(over + 1)).toFixed(2)}`
})

socket.on('playersScore', ({p1, p2})=>{
    console.log(p1, p2);
    var p1Runs = (p1['1']?p1['1']:0) + (p1['2']?p1['2']*2:0) + (p1['3']?p1['3']*3:0) + (p1['4']?p1['4']*4:0) + (p1['6']?p1['6']*6:0);
    var p1Balls = (p1['0']?p1['0']:0) + (p1['1']?p1['1']:0) + (p1['2']?p1['2']:0) + (p1['3']?p1['3']:0) + (p1['4']?p1['4']:0) + (p1['6']?p1['6']:0);
    var p2Runs = (p2[1]?p2[1]:0) + (p2[2]?p2[2]*2:0) + (p2[3]?p2[3]*3:0) + (p2[4]?p2[4]*4:0) + (p2[6]?p2[6]*6:0);
    var p2Balls = (p2['0']?p2['0']:0) + (p2['1']?p2['1']:0) + (p2['2']?p2['2']:0) + (p2['3']?p2['3']:0) + (p2['4']?p2['4']:0) + (p2['6']?p2['6']:0);

    document.getElementById('player1-runs').innerHTML = `
    <p>${p1Runs}(${p1Balls})</p>
    <p>${p1['4']?p1['4']:0}</p>
    <p>${p1['6']?p1['6']:0}</p>
    <p>${ (p1Runs/p1Balls)?((p1Runs/p1Balls)*100).toFixed(1):0}</p>`
    
    document.getElementById('player2-runs').innerHTML = `
    <p>${p2Runs}(${p2Balls})</p>
    <p>${p2['4']?p2['4']:0}</p>
    <p>${p2['6']?p2['6']:0}</p>
    <p>${ (p2Runs/p2Balls)?((p2Runs/p2Balls)*100).toFixed(1):0}</p>`
})

socket.on('score update',(rows)=>{
    console.log(rows);
    lastBall = rows[rows.length-1];
    if(rows.length > 0){
        document.getElementById('batter1Name').value = rows[rows.length - 1]['player1'];
        document.getElementById('batter2Name').value = rows[rows.length - 1]['player2'];
        document.getElementById('bowlerName').value = rows[rows.length - 1]['bowler'];

        if(rows[rows.length-1]['strikeChanged'] == true){
            if(rows[rows.length-1]['striker']==1)
                striker = 2;
            else
                striker = 1;
        }else{
            striker = rows[rows.length-1]['striker'];
        }

        updateStriker();

        over = rows[rows.length - 1]['over'];

        var idx= rows.length - 1;
        while(rows[idx]['ball'] == 'wd' || rows[idx]['ball'] == 'nb') idx--;
        balls = Number(rows[idx]['ball']) + 1;

        if(wickets >= 9 && inning=='1st'){
            endInning();
        }
        else if(wickets >=9 && inning=='2nd'){
            alert('end match')
            return
        }

        if(balls > 6){
            balls = 1;
            over += 1;
            console.log('over end');
            document.getElementById('bowlerName').value = '';

            if(over >= playingTeam['overs']) alert('end inning')
        }
    }
})

socket.on('get bowler name',()=>{
    console.log(document.getElementById('bowlerName').value);
    socket.emit('bowler name', (document.getElementById('bowlerName').value))
})

socket.on('match result', (res)=>{
    document.getElementById('match-result').innerHTML = `<h3>${res}</h3> <p>click "clear data" to start new match</p>`;
    // console.log(res);
})

socket.on('match title', (teams)=>{
    document.getElementById('match-result').innerHTML = teams[0]+"vs"+teams[1];
})

socket.on('go to loader',()=>{
    document.location = '/'
})


function loadNames(){
    const names = {
        player1 : document.getElementById('batter1Name').value,
        player2 : document.getElementById('batter2Name').value,
        bowler : document.getElementById('bowlerName').value
    };

    socket.emit('load names', (names))
}

function updateStriker(){
    if(striker == 1){
        document.getElementById('batter1').checked = true;
        document.getElementById('batter2').checked = false;
    }else{
        document.getElementById('batter1').checked = false;
        document.getElementById('batter2').checked = true;
    }
}

function getStriker(){
    if(document.getElementById('batter1').checked == true){
        return 1;
    }else   return 2;
}

function addRun(ball){
    player1 = document.getElementById('batter1Name').value;
    player2 = document.getElementById('batter2Name').value;
    bowler = document.getElementById('bowlerName').value;
    striker = getStriker();
    
    if(player1 == '' || player2 == '' || bowler == ''){
        return;
    }

    if(ball == 'wd'){
        socket.emit('insert score', [playingTeam['name'], over, ball, player1, player2, bowler, 0, striker, false, 0]);
    }
    else if(ball == 'nb'){
        document.getElementById('modal-no').style.visibility = 'visible';
    } 
    else{                
        socket.emit('insert score', [playingTeam['name'], over, balls, player1, player2, bowler, ball, striker, false, 0]);

        balls += 1;
        if(balls > 6){
            balls = 1;
            over++;
            document.getElementById('bowlerName').value = '';
        }
    }

}

function runOut(player){ 
    player1 = document.getElementById('batter1Name').value;
    player2 = document.getElementById('batter2Name').value;
    bowler = document.getElementById('bowlerName').value;

    if(document.getElementById('bowlerName').value == '') return;

    if(player == 1){
            socket.emit('insert score', [playingTeam['name'], over, balls, '', player2, bowler, 'wicket', striker, false, player]);
    }
    else if(player == 2){
            socket.emit('insert score', [playingTeam['name'], over, balls, player1, '', bowler, 'wicket', striker, false, player]);
    }

    
    balls += 1;
    if(balls > 6){
        balls = 1;
        over++;
        document.getElementById('bowlerName').value = '';
    }
    document.getElementById('modal-no').style.visibility = 'hidden';
}

function addNoRun(ball){
    player1 = document.getElementById('batter1Name').value;
    player2 = document.getElementById('batter2Name').value;
    bowler = document.getElementById('bowlerName').value;
    striker = getStriker();

    if(ball == 'wd'){
        socket.emit('insert score', [playingTeam['name'], over, 'nb', player1, player2, bowler, 0, striker, false, 0]);
    }else{
        socket.emit('insert score', [playingTeam['name'], over, 'nb', player1, player2, bowler, ball, striker, false, 0]);

        
    }

    document.getElementById('modal-no').style.visibility = 'hidden';
}

function endInning(){
    if(confirm('End 1st Inning ?')){
        if(playingTeam['target']) return;
        socket.emit('end inning', ([(runs+extra), over]));
        over = 0; runs=0; extra=0; wickets=0;
        document.getElementById('batter1Name').value = '';
        document.getElementById('batter1').checked = true;
        document.getElementById('batter2Name').value = '';
    }
}

function endMatch(){
    if(confirm('end match')){
        socket.emit('end match', ([(runs+extra), over]))
    }
}

function popBall(){
    if(lastBall == undefined) return;
    socket.emit('popBall');
}

function clearData(){
    socket.emit('destroy tables');
}

function hideScore(){
    console.log('object');
    socket.emit('hide score')
}

function onlyScore(){
    socket.emit('keep score');
}