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

var app = express();
app.use(express.static('public'));


app.get('/search/:name', function(request, response){
		var searchReq = getFromApi('search',{
			q: request.params.name,
			limit: 1,
			type: 'artist'
		});

		searchReq.on('end', function(item){
			
			var artist = item.artists.items[0];
			var related = getFromApi('artists/'+artist.id+'/related-artists');
			
			related.on('end', function(item){
					artist.related = item.artists;
					response.json(artist);
			});

			related.on('error', function(code){
				response.sendStatus(code);
			});

		});

		searchReq.on('error', function(code){
			response.sendStatus(code);
		});
});

app.listen(8080);