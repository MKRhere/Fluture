import concurrify from 'concurrify';
import type from 'sanctuary-type-identifiers';
import {Core, Future, never} from './core';
import {race, ap, map, alt} from './dispatchers';
import {noop, show} from './internal/fn';
import {isFunction} from './internal/is';
import {typeError, invalidArgument} from './internal/throw';
import {FL} from './internal/const';

function check$ap$f(f){
  if(!isFunction(f)) typeError(
    'Future#ap expects its first argument to be a Future of a Function'
    + '\n  Actual: Future.of(' + show(f) + ')'
  );
}

export function ParallelAp(mval, mfunc){
  this._mval = mval;
  this._mfunc = mfunc;
}

ParallelAp.prototype = Object.create(Core);

ParallelAp.prototype._fork = function ParallelAp$fork(rej, res){
  var func, val, okval = false, okfunc = false, rejected = false, c1, c2;

  function ParallelAp$rej(x){
    if(!rejected){
      rejected = true;
      rej(x);
    }
  }

  c1 = this._mval._fork(ParallelAp$rej, function ParallelAp$fork$resVal(x){
    c1 = noop;
    if(!okval) return void (okfunc = true, val = x);
    res(func(x));
  });
  c2 = this._mfunc._fork(ParallelAp$rej, function ParallelAp$fork$resFunc(f){
    c2 = noop;
    check$ap$f(f);
    if(!okfunc) return void (okval = true, func = f);
    res(f(val));
  });

  return function ParallelAp$fork$cancel(){
    c1();
    c2();
  };
};

ParallelAp.prototype.toString = function ParallelAp$toString(){
  return 'new ParallelAp(' + this._mval.toString() + ', ' + this._mfunc.toString() + ')';
};

export var Par = concurrify(Future, never, race, function pap(mval, mfunc){
  return new ParallelAp(mval, mfunc);
});

Par.of = Par[FL.of];
Par.zero = Par[FL.zero];
Par.map = map;
Par.ap = ap;
Par.alt = alt;

export function isParallel(x){
  return x instanceof Par || type(x) === Par['@@type'];
}

export function seq(par){
  if(!isParallel(par)) invalidArgument('Future.seq', 0, 'to be a Par', par);
  return par.sequential;
}
