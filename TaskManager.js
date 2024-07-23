class TaskManager {
    constructor(maxConcurrentTasks) {
        this.maxConcurrentTasks = maxConcurrentTasks;
        this.tasks = [];
        this.statuses = new Map();
        this.currentlyRunning = 0;
    }

    addTask(task, priority, dependencies, timeout = 0) {
        const id = `task${this.tasks.length + 1}`;
        this.tasks.push({ id, task, priority, dependencies, status: 'pending', timeout });
        this.statuses.set(id, 'pending');
    }

    getStatus() {
        const statusObj = {};
        this.statuses.forEach((status, id) => {
            statusObj[id] = status;
        });
        return statusObj;
    }

    async executeTasks() {
        const executeTask = async (task) => {
            if (task.timeout > 0) {
                task.task = this.withTimeout(task.task, task.timeout);
            }

            try {
                this.statuses.set(task.id, 'running');
                await task.task();
                this.statuses.set(task.id, 'completed');
            } catch (error) {
                this.statuses.set(task.id, 'failed');
            } finally {
                this.currentlyRunning--;
            }
        };

        const canExecute = (task) => {
            return task.dependencies.every(dep =>
                this.statuses.get(dep) === 'completed' || this.statuses.get(dep) === 'failed');
        };

        while (this.tasks.length > 0) {
            const executableTasks = this.tasks
                .filter(task => this.statuses.get(task.id) === 'pending' && canExecute(task))
                .sort((a, b) => b.priority - a.priority);

            for (const task of executableTasks) {
                if (this.currentlyRunning >= this.maxConcurrentTasks) break;
                this.currentlyRunning++;
                await executeTask(task);
            }

            await new Promise(resolve => setTimeout(resolve, 100));
            this.tasks = this.tasks.filter(task => this.statuses.get(task.id) === 'pending');
        }
    }

    withTimeout(task, timeout) {
        return async () => {
            return new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    reject(new Error('Task timed out'));
                }, timeout);

                task().then(
                    (result) => {
                        clearTimeout(timer);
                        resolve(result);
                    },
                    (error) => {
                        clearTimeout(timer);
                        reject(error);
                    }
                );
            });
        };
    }
}

// Пример использования

const taskManager = new TaskManager(2);

taskManager.addTask(async () => {
    console.log('Задача 1 началась');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('Задача 1 завершена');
}, 2, [], 2500);

taskManager.addTask(async () => {
    console.log('Задача 2 началась');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Задача 2 завершена');
}, 1, ['task1'], 2000);

taskManager.addTask(async () => {
    console.log('Задача 3 началась');
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('Задача 3 завершена');
}, 3, [], 1000);

taskManager.addTask(async () => {
    console.log('Задача 4 началась');
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('Задача 4 завершена');
}, 1, ['task2', 'task3'], 3500);

taskManager.addTask(async () => {
    console.log('Задача 5 началась');
    await new Promise((_, reject) => setTimeout(() => {
        console.log('Задача 5 завершена с ошибкой');
        reject(new Error('Ошибка в задаче 5'));
    }, 1500));
}, 2, [], 2000);

taskManager.addTask(async () => {
    console.log('Задача 6 началась');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Задача 6 завершена');
}, 1, [], 1500);

taskManager.addTask(async () => {
    console.log('Задача 7 началась');
    await new Promise(resolve => setTimeout(resolve, 2500));
    console.log('Задача 7 завершена');
}, 2, ['task5'], 3000);

const monitorInterval = setInterval(() => {
    const status = taskManager.getStatus();
    console.log('Текущий статус задач:', status);
    if (Object.values(status).every(s => s === 'completed' || s === 'failed')) {
        clearInterval(monitorInterval);
    }
}, 500);

taskManager.executeTasks().then(() => {
    console.log('Все задачи выполнены');
    console.log('Статус задач после выполнения:', taskManager.getStatus());
}).catch(error => {
    console.error('Ошибка при выполнении задач:', error);
});