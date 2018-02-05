/*

WordPlay
The Office For Creative Research
May, 2014

https://github.com/blprnt/wordplay

*/


var rita = require('rita');
var lev = require('levenshtein');
const appRoot = require('app-root-path');

var tol = 0.1;

var corpusList = ["shakes","bible","freud","mobydick","bieber","momatitles"];
var corpii = [];

for (var i = 0; i < corpusList.length; i++) {
	console.log("LOADING CORPUS: " + corpusList[i]);
	corpii[corpusList[i]] = require(appRoot + '/corpii/' + corpusList[i] + '.json');
	console.log(corpusList[i] + ":" + corpii[corpusList[i]]);
}

function getWordMatches(pattern, corp, max) {

	var returns = [];

	console.log("Requested match for: " + pattern)
	//Get match parameters for the input string
	var matchList = rita.RiTa.getPosTags(pattern);
	var match = matchList.join(" ");
	var stresses = rita.RiTa.getStresses(pattern);
	var syllables = countSyllables(stresses);
	console.log(match + ":" + stresses + ":" + syllables);

	//choose the correct corpus
	var corpus = corpii[corp];

	if (corpus) {

		//Go through the corpus and extract lines that have a match somewhere for the POS
		var candidates = [];
		console.log("CHECKING AGAINST " + corpus.lines.length + " LINES.");
		for(var i = 0; i < corpus.lines.length; i++) {
			var line = corpus.lines[i];
			//if (i % 100 == 0) console.log(line.pos + ":" + match + " ---- " + line.pos.indexOf(match));
			if (line.pos.indexOf(match) != -1) candidates.push(line); 
		}

		var totalLines = corpus.lines.length;
		var tokenMap = {};

		//Now go through these candidates and get the piece that matches; also score
		for (var i = 0; i < candidates.length; i++) {
			var c = candidates[i];
			var cstrip = rita.RiTa.stripPunctuation(c.text);
			var words = rita.RiTa.tokenize(c.text);
			var posa = c.pos.split(" ");
			var stressa = c.stress.split(" ");
			var counta = c.counts.split(" ");

			//Cycle through all potential segments and score them
			
			for(var j = 0; j < words.length - matchList.length + 1; j++) {
				var sss = posa.slice(j, j + matchList.length).join(" ");

				var posdist = computeEditDistance(sss, match);
     			var posfdist = posdist / sss.length;

				if (posfdist < tol && stressa.length >= words.length) {


					var seg = words.slice(j, j + matchList.length).join(" ");
					var sstresses = stressa.slice(j, j + matchList.length).join(" ");
					var scounts = counta.slice(j, j + matchList.length).join(" ");

					//Cumulative score for the segment
					var scoreCount = 0;
					var clist = scounts.split(" ");
					for(var k = 0; k < clist.length; k++) {
						scoreCount += parseInt(clist[k]);
					}

					var syllables = countSyllables(sstresses);

					var dist = computeEditDistance(stresses, sstresses);
					var stol = dist/stresses.length;

					var mainLev = lev(pattern, seg);
					var stressLev = lev(stresses, sstresses );
					var posLev = lev( sss, match );

					var levScore = (posLev * 10) + (stressLev * 5) + mainLev;

					//console.log(" ");
					//console.log(match + ":" + sss);
					//console.log(seg + ":" + mainLev + ":" + stressLev + " : " + posLev);

					if((stol < tol || stresses.length == sstresses.length) && !tokenMap[seg.toString()]) {
						tokenMap[seg.toString()] = true;
						returns.push({'segment':seg, 'sentence':c.text, 'quality':levScore, 'score':Math.round((scoreCount / totalLines) * 100) / 100});	
						//console.log(tokenMap);
					} else if (tokenMap[seg]) {
						//console.log('already had:' + seg);
					}


				}
			}
			

		}
		console.log("MATCHING DONE.")

	} else {
		console.log("COULDN'T LOAD CORPUS: " + corp);
	}

	returns.sort(function(a,b) { return parseFloat(a.quality) - parseFloat(b.quality) } );

	if (max) {
		returns = returns.slice(0, max);
	}




	return({'query':pattern, 'corpus':corp, 'results':returns});
}

function countSyllables(s) {
	var syllables = 0;
  	var sswords = s.split(" ");
	 for (var i = 0; i < sswords.length; i++) {
	    syllables += sswords[i].split("/").length;
	 }
	 return(syllables);

}

function computeEditDistance( s1,  s2) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();

  var costs = [];
  for (var i = 0; i <= s1.length; i++) {
    var lastValue = i;
    for (var j = 0; j <= s2.length; j++) {
      if (i == 0)
        costs[j] = j;
      else {
        if (j > 0) {
          var newValue = costs[j - 1];
          if (s1.charAt(i - 1) != s2.charAt(j - 1))
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0)
      costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

module.exports.getWordMatches = getWordMatches;