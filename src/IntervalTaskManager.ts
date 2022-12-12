class IntervalTaskManager {
  private readonly _taskList: Map<string, Function> = new Map()

  public addTask (
    taskName: string,
    job: Function,
    opt: { interval: number, immediately: boolean }
  ): void {
    const jobWrapper: () => void = () => setInterval(job, opt.interval)
    this._taskList.set(taskName, jobWrapper)
    if (opt.immediately) {
      this.runTask(taskName)
    }
  }

  public runTask (taskName: string): void {
    const task = this._taskList.get(taskName)
    if (task != null) {
      const timer = task()
      this._taskList.set(taskName, timer)
    }
  }

  private _runAllTask (): void {
    for (const taskName of Object.keys(this._taskList)) {
      this.runTask(taskName)
    }
  }

  private _clearAllTask (): void {
    for (const task of Object.values(this._taskList)) {
      clearInterval(task)
    }
  }
}

export const intervalTaskManager = new IntervalTaskManager()
