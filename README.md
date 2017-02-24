# dspcalc - Distributed calculator for University of Helsinki course Distributed Systems Project

## Dependencies, installed as root or with sudo. Instructions are for Debian/Ubuntu, adapt to your distribution if needed.

Node.js (v6.x, current stable) is needed for the server. If you wish to run the server automatically, you'll also need to install forever.
```
curl -sL https://deb.nodesource.com/setup_6.x | bash -
npm install -g forever
```

Gnuplot is needed on the server for step 2, variation 1.
```
apt-get install gnuplot
```

Frontend (step1, step2, step3) can be run on any webserver. Our example is for nginx.
```
apt-get install nginx
```

## Installation

1) Clone the repository from https://github.com/ajmyyra/dspcalc.git
- Repository is not public, so deploy key needs to be set up before hand.
- If repository isn't available, you can just untar the package attached along the report. Run this in your home folder (assumed to be /home/dsp for the rest of this instruction))
```
mkdir dspcalc
mv dspcalc.tar dspcalc/
cd dspcalc
untar dspcalc.tar
```

2) Install dependencies & set up config for the server. This needs to be run in the same folder as untar, so if you've moved, go back. Config options are explained in detail below.
```
npm install
cp config.js.example config.js
nano config.js
```

3) Set up web server for static files. Our example config is for nginx, but same applies to Apache or any other.
```
server {
	listen 80;
	listen [::]:80;

	# Example folder, empty or with a file with links to different steps.
	root /home/dsp/dsp;

	index index.html index.htm;
	server_name dsp.example.com;

	access_log /var/log/nginx/dsp.example.com-access.log;
	error_log /var/log/nginx/dsp.example.com-error.log;

	location /step1 {
		alias /home/dsp/dspcalc/step1;
		try_files $uri $uri/ =404;
	}

	location /step2 { 
		autoindex on; # needed as step 2 contains variations
        alias /home/dsp/dspcalc/step2;
        try_files $uri $uri/ =404;
    }

	location /step3 {
        alias /home/dsp/dspcalc/step3;
        try_files $uri $uri/ =404;
    }

	location ~ /\.git {
		deny all;
	}
}
```

4) Start the Node.js server and start using different steps. Server can be run really easily for testing.
```
node server.js
```

For any longer deployments, running the server with forever or m2 is recommended.
```
forever start /home/dsp/dspcalc/server.js
```

It might be a good thing to set a cronjob in case your server restarts.

```
@reboot /usr/bin/forever start 
```

Enjoy! Server logs can be found under ~/.forever/ .

## Config options

```
module.exports = {
	'serverport': '8080',
	'origin': 'http://localhost:8000',
	'plotfile': 'plot.temp.dat',
	'sinfile': 'sinplot.png'
}
```

'serverport' is the port you're running the server in. If you change it to something else, remember to proxy port 8080 to it as frontend is set up to contact that port.

'origin' is the hostname of your server. Config.js.example consists of examples for localhost deployment, but if you're running it on an actual server, you'll need its hostname (or ip address) that you use to connect to it with your browser. Without it, your server will add a wrong header and browser refuses to use the results.

'plotfile' is a temporary file where we'll save the received sin plot for gnuplot usage. It will be deleted immediately when the response is succesfully sent.

'sinfile' is a temporary file where we'll save the output from Gnuplot. It will be deleted immediately when the response is succesfully sent.

## Motivation

This project was made for a course Distributed Systems project organized by University of Helsinki. Project description can be found in Assingment-Multitier.pdf and documentation from Documentation.pdf.
