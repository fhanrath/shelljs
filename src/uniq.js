var common = require('./common');
var fs = require('fs');

//add c spaces to the left of str
function lpad(c, str){
  var res = '' + str;
  if(res.length < c){
    res = Array((c-res.length)+1).join(' ') + res;
  }
  return res;
}

common.register('uniq', _uniq, {globStart: 1, canReceivePipe: true});

//@
//@ ### uniq([options,] [input, [output]])
//@ Available options:
//@
//@ + `-i`: Ignore case while comparing
//@ + `-c`: Prefix lines by the number of occurrences
//@ + `-d`: Only print duplicate lines, one for each group of identical lines
//@
//@ Examples:
//@
//@ ```javascript
//@ uniq('foo.txt');
//@ uniq('-i', 'foo.txt');
//@ uniq('-cd', 'foo.txt', 'bar.txt');
//@ ```
//@
//@ Filter adjacent matching lines from input
function _uniq(options, input, output) {
  options = common.parseOptions(options, {
    'i': 'ignoreCase',
    'c': 'count',
    'd': 'duplicates'
  });

  // Check if this is coming from a pipe
  var pipe = common.readFromPipe(this);

  if (!input && !pipe)
    common.error('no input given');

  var lines = (input ? fs.readFileSync(input, 'utf8') : pipe).
              trimRight().
              split(/\r*\n/);

  var compare = function(a, b){
    return options.ignoreCase ? 
             a.toLocaleLowerCase().localeCompare(b.toLocaleLowerCase()) :
             a.localeCompare(b);
  };
  var uniqed = lines.reduceRight(function(res, e){
                 //Perform uniq -c on the input
                 return res.length === 0 ? [{count: 1, ln: e}] :
                        (compare(res[0].ln,e) === 0 ? 
                          [{count: res[0].count + 1, ln: e}].concat(res.slice(1)) :
                          [{count: 1, ln: e}].concat(res));
               }, []).filter(function(obj){
                 //Do we want only duplicated objects?
                 return options.duplicates ? obj.count > 1 : true;
               }).map(function(obj){
                 //Are we tracking the counts of each line?
                 return (options.count ? (lpad(7,obj.count) + ' ') : '') + obj.ln;
               }).join('\n') + '\n';

  var res = new common.ShellString(uniqed, common.state.error, common.state.errorCode);
  if(output){
    res.to(output);
    //if uniq writes to output, nothing is passed to the next command in the pipeline (if any)
    return new common.ShellString('', common.state.error, common.state.errorCode);
  }else{
    return res;
  }
}

module.exports = _uniq;