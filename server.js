console.log('Spotify server online');

var unirest = require('unirest');
var express = require('express');
var events = require('events');

var getFromApi = function(endpoint, args){
	var emitter = new events.EventEmitter();
	unirest.get('https://api.spotify.com/v1/' + endpoint)
		.qs(args)
		.end(function(response){
			if(response.ok){
				emitter.emit('end', response.body);
			}else{
				emitter.emit('error', response.code);
			}
		});
	return emitter;
};

var topTracks = function(musician, callback){
	var findTracks = getFromApi('artists/'+musician.id+'/top-tracks?country=US');
	
	findTracks.on('end', function(item){
		var hotTracks = item.tracks;
		callback(hotTracks);
	});
	findTracks.on('error', function(error){
		callback(error);
	});
};

var app = express();
app.use(express.static('public'));

app.get('/search/:name', function(request, response){
		var searchReq = getFromApi('search',{
			q: request.params.name,
			limit: 1,
			type: 'artist'
		});
		searchReq.on('end', function(item){
			if(typeof item.artists.items[0] === 'undefined'){
				searchReq.emit('error', 404);
			}else{
				var artist = item.artists.items[0];
			
				var related = getFromApi('artists/'+artist.id+'/related-artists');			
				related.on('end', function(item){
					artist.related = item.artists;	
				
					var completed = 0;
					artist.related.forEach(function(musician){
						topTracks(musician, function(hotTracks){
							musician.tracks = hotTracks; 
							completed++;
							if(completed === artist.related.length){
								response.json(artist);
							};
						});
					});
				});
				related.on('error', function(code){
					response.sendStatus(code);
				});
			}
		});
		searchReq.on('error', function(code){
			response.sendStatus(code);
		});
});

app.listen(8080);