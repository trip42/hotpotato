var
    express = require( 'express' )
    , app = express()
    , server = require( 'http' ).Server( app )
    , io = require( 'socket.io' ).listen( server )
    , port = process.env.PORT || 5000
    , players = []
    , maxPlayers = 3
    , potatoPosition = 0
    , timer = null
    , host = null
;

server.listen( port );

app.get( '/', function( req, res ) {
    res.sendFile( __dirname + '/static/client.html' );
});

// serve static files
app.use( express.static( __dirname + '/static/' ) );

function movePotato( offset ) {
    // move the potato
    potatoPosition += offset;

    if ( potatoPosition >= players.length ) {
        potatoPosition = 0;
    } else if ( potatoPosition < 0 ) {
        potatoPosition = players.length - 1;
    }

    if ( players[ potatoPosition ].alive ) {
        console.log( players[ potatoPosition ].name );
        io.sockets.emit( 'potato moved', potatoPosition );
    } else {
        movePotato( offset );
    }
}

function startTimer() {
    var time = Math.floor( Math.random() * ( 30000 - 5000 ) ) + 5000;

    io.sockets.emit( 'start' );
    console.log( 'start', time );

    setTimeout( function() {
        var player = players[ potatoPosition ];

        player.alive = false;

        console.log( player.name, ' is out' );
        movePotato( 1 );

        io.sockets.emit( 'stop', player.clientId );

        setTimeout( startTimer, 10000 );

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

            console.log( 'Player', player.name, 'joined' );
            socket.emit( 'joined', 'ok', player.clientId );
            socket.emit( 'potato moved', potatoPosition );

            if ( players.length === maxPlayers ) {
                startTimer();
            } else {
                console.log( 'need', maxPlayers - players.length, 'more players' );
            }
        }
    } );
} );

console.log( 'server started' );
