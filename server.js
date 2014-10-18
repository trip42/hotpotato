var
    express = require( 'express' )
    , app = express()
    , server = require( 'http' ).Server( app )
    , io = require( 'socket.io' ).listen( server )
    , port = process.env.PORT || 5000
    , players = []
    , maxPlayers = 20 
    , potatoPosition = 0
    , timer = null
;

server.listen( port );

app.get( '/', function( req, res ) {
    res.sendFile( __dirname + '/static/client.html' );
});

app.get( '/status', function( req, res ) {
    res.send( JSON.stringify({
        players: players,
        maxPlayers: maxPlayers,
        potatoPosition: potatoPosition
    }, null, 4 ) );
});

// serve static files
app.use( express.static( __dirname + '/static/' ) );

function getPlayersRemaining() {
    var numPlayers = 0;
    for ( var i in players ) {
        if ( players[ i ] && players[ i ].alive ) {
            numPlayers++;
        }
    }
    return numPlayers;
}

function movePotato( offset ) {
    var player;

    // move the potato
    potatoPosition += offset;

    if ( potatoPosition >= players.length ) {
        potatoPosition = 0;
    } else if ( potatoPosition < 0 ) {
        potatoPosition = players.length - 1;
    }

    player = players[ potatoPosition ];

    if ( player && player.alive ) {
        console.log( 'potato moved', potatoPosition, JSON.stringify( player ) );
        io.sockets.emit( 'potato moved', player );
    } else if ( getPlayersRemaining() ) {
        movePotato( offset );
    } else {
        console.log( 'where did everybody go?' );
        endGame();
    }
}

function endGame() {
    io.sockets.emit( 'disconnect' );
    players = [];
    potatoPosition = 0;
}

function startTimer() {
    var time = Math.floor( Math.random() * ( 25000 - 5000 ) ) + 5000;

    io.sockets.emit( 'start' );

    setTimeout( function() {
        var player = players[ potatoPosition ];
        var playersRemaining = getPlayersRemaining();

        player.alive = false;

        movePotato( 1 );

        io.sockets.emit( 'stop', player );

        console.log( 'player out', JSON.stringify( player ) );

        if ( playersRemaining > 1 ) {
            setTimeout( startTimer, 10000 );
        } else if ( playersRemaining === 1 ) {
            io.sockets.emit( 'winner', players[ potatoPosition ] );
            endGame();
        } else {
            endGame();
        }

    }, time )
}

io.on( 'connection', function( socket ) {
    socket.on( 'join', function( name ) {
        if ( players.length > maxPlayers ) {
            socket.emit( 'joined', 'full' );
            return;
        } else {
            var player = {
                name: name,
                alive: true,
                clientId: players.length
            };

            players.push( player );

            socket.on( 'pass', function() {
                if ( player.clientId === potatoPosition ) {
                    movePotato( 1 );
                }
            } );

            socket.on( 'disconnect', function() {
                player.alive = false;
                if ( player.clientId === potatoPosition ) {
                    movePotato( 1 );
                }
            } );

            io.sockets.emit( 'join', player );
            socket.emit( 'joined', 'ok', player.clientId );
            socket.emit( 'potato moved', players[ potatoPosition ] );

            if ( players.length === maxPlayers ) {
                startTimer();
            } else {
                io.sockets.emit( 'need players', maxPlayers - players.length );
            }
        }
    } );
} );

console.log( 'server started' );
