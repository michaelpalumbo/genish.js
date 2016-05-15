'use strict'

let gen  = require('./gen.js'),
    utilities = require( './utilities.js' )

let proto = {
  basename:'data',
  globals: {},

  gen() {
    let idx
    if( gen.memo[ this.name ] === undefined ) {
      let ugen = this
      gen.requestMemory( this.memory ) //, ()=> {  console.log("CALLED", ugen); gen.memory.set( ugen.buffer, idx ) } )
      //console.log( 'MEMORY', this.memory, this.buffer.length )
      idx = this.memory.values.idx
      try {
        gen.memory.set( this.buffer, idx )
      }catch( e ) {
        console.log( 'error with request. asking for ' + this.buffer.length +'. current index: ' + gen.memoryIndex + ' of ' + gen.memory.length )
        throw e
      }
      //gen.data[ this.name ] = this
      //return 'gen.memory' + this.name + '.buffer'
      gen.memo[ this.name ] = idx
    }else{
      idx = gen.memo[ this.name ]
    }
    return idx
  },
}

module.exports = ( x, y=1, properties ) => {
  let ugen, buffer, shouldLoad = false
  
  if( properties !== undefined && properties.global !== undefined ) {
    if( gen.globals[ properties.global ] ) {
      return gen.globals[ properties.global ]
    }
  }

  if( typeof x === 'number' ) {
    if( y !== 1 ) {
      buffer = []
      for( let i = 0; i < y; i++ ) {
        buffer[ i ] = new Float32Array( x )
      }
    }else{
      buffer = new Float32Array( x )
    }
  }else if( Array.isArray( x ) ) { //! (x instanceof Float32Array ) ) {
    let size = x.length
    buffer = new Float32Array( size )
    for( let i = 0; i < x.length; i++ ) {
      buffer[ i ] = x[ i ]
    }
  }else if( typeof x === 'string' ) {
    buffer = { length: y > 1 ? y : gen.samplerate * 60 }
    shouldLoad = true
  }else if( x instanceof Float32Array ) {
    buffer = x
  }
  
  ugen = { 
    buffer,
    name: proto.basename + gen.getUID(),
    dim:  buffer.length,
    channels : 1,
    gen:  proto.gen,
    onload: null,
    then( fnc ) {
      ugen.onload = fnc
      return ugen
    },
  }

  ugen.memory = {
    values: { length:ugen.dim, index:null }
  }

  gen.name = 'data'+gen.getUID()

  if( shouldLoad ) {
    let promise = utilities.loadSample( x, ugen )
    promise.then( ( _buffer )=> { 
      ugen.memory.values.length = _buffer.length     
      ugen.onload() 
    })
  }
  
  if( properties !== undefined && properties.global !== undefined ) {
    gen.globals[ properties.global ] = ugen
  }

  return ugen
}
