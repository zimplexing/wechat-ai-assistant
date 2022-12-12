// use local json file as cache
import fs from 'fs'
export class Cache {
  private _cache: Record<string, any>
  constructor (private readonly _file: string) {
    if (fs.existsSync(_file)) {
      this._cache = JSON.parse(fs.readFileSync(_file, 'utf-8'))
    } else {
      this._cache = {}
    }
  }

  get (key: string): any {
    return this._cache[key]
  }

  async set (key: string, value: any): Promise<void> {
    this._cache[key] = value
    fs.writeFileSync(this._file, JSON.stringify(this._cache))
  }

  async delete (key: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this._cache[key]
    fs.writeFileSync(this._file, JSON.stringify(this._cache))
  }
}
