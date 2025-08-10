import { Transform } from 'node:stream';

class SSEParser extends Transform {
  _saved = '';
  constructor(options={}) {
    super({...options, objectMode: true});
  }
  _transform(chunk: any, _encoding: BufferEncoding, callback: () => void) {
		let out: string = '';
    if(typeof chunk!=='string')
      out = chunk.toString();
		else
			out = chunk;
    this._saved += chunk;
    const reg = /(event: (?<event>.+)\n)?data: (?<data>.+)\r?\n\r?\n/g;
    let res, nextStart = null;
    while(res = reg.exec(this._saved)) {
			if(!res?.groups) continue;
      nextStart = reg.lastIndex;
      this.push({event: res.groups.event, data: res.groups.data})
    }
    if(nextStart) {
      this._saved = this._saved.substring(nextStart);
    }
    callback();
  }
}

export default SSEParser;
