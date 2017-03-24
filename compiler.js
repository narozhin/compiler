
// Tokeniser
// Генерирует токены - атомарные части входящего выражения
// Токен представляет из себя объект с описанием типа токена и значения
// Пример: ( add 1 "text") -> [{type: 'parent', value: '('}, {type: 'name', value: 'add'}, {type: 'number', value: '1'}, {type: 'string', value: 'text'}, {type: 'parent', value: ')'}]
// Функция проходит по всем символам в строке и добавляет токены в массив tokens, если символ удовлетворяет определенным ниже правилам
const tokenizer = (input) => {
    let current = 0 // Номер текущего символа в строке
    const tokens = [] // Массив токенов

    while(current < input.length) {
        let char = input[current]
        const WHITESPACE = /\s/ // Проверка на пробельный символ
        const NUMBER = /[0-9]/ // Проверка на цифру
        const LETTER = /[a-z]/ // Проверка на строчный символ
        if(char === '(') { // Если символ - открывающая скобка - добавить новый токен
            tokens.push({type: 'parent', value: '('})
            current++ // Переход к следующему символу
            continue
        }
        if(char === ')') { // Если символ - закрывающая скобка - добавить новый токен
            tokens.push({type: 'parent', value: ')'})
            current++ // Переход к следующему символу
            continue
        }
        if(WHITESPACE.test(char)) { // Если символ - пробел - пропустить
            current++  // Переход к следующему символу
            continue
        }
        if(NUMBER.test(char)) { // Если символ - цифра
            let value = ''
            while(NUMBER.test(char)) { // Начниая с текущего символа добавлять в строку value значения, пока символ не перестанет быть цифрой
                value += char // Добавить значение текущего символа в value
                char = input[++current] // Переход к следующему символу и получение его значения
            }
            tokens.push({type: 'number', value: value}) // Добавить новый токен - число
            continue
        }
        if(char === '"') { // Если символ - двойная ковычка, ожидаем, что дальше будет текстовое значение
            let value = ''
            char = input[++current] // Взять следующий символ
            if(!char) throw new Error('[TOKENIZER] String parsing error') // Если конец входящих данных, но нет закрывающего символа - ошибка
            while(char !== '"') { // Пока не будет найден закрывающий символ - добавлять значение текущего символа в строку value
                value += char
                char = input[++current] // Переход к следующему символу и получение его значения
                if(!char) throw new Error('[TOKENIZER] String parsing error') // Если закрывающий символ не был найден - ошибка
            }
            tokens.push({type: 'string', value: value})
            current++ // Переход к следующему символу
            continue
        }
        if(LETTER.test(char)) { // Если символ литерал - текст, но не текстовое значение
            let value = ''
            while(LETTER.test(char)) { // Начиная с текущего символа добавлять значения в строку value, пока символ удовлетворяет регулярному выражения LITERAL или не закончится входящие данные
                value += char
                char = input[++current] // Переход к следующему символу и получение его значения
                if(!char) break // Если символа нет - конец строки
            }
            tokens.push({type: 'name', value: value})
            current++ // Переход к следующему символу
            continue
        }
        throw new Error('[TOKENIZER] Unknow character: ' + char) // Если нет правила для символа - ошибка
    }
    return tokens
}

// PARSER
// Преобразовывает массив токенов в абстрактное синтаксическое дерево - Abstract Syntactic Tree (AST)
// Создает древовидную структуру данных. Все литералы преобразуются в ветви дерева, а элементарные токены (Строковые, числовые) в листья
// Определяет вложенности объекта и связи между ними. (add 1 2) - add - литерал - родитель(ветка), 1 и 2 - элементарные дочерние элементы - листья
// Пример (add 1 2) -> {type: 'Program', params: [ {type: 'CallExpression', name: 'add', params: [ {type: 'NumberLiteral', value: '1'}, {type: 'NumberLiteral', value: '2'} ] } ] }
const parser = (tokens) => {
    let current = 0 // Номер текущего токена в массиве

    const walk = () => { // Взять текущий токен и вернуть сформированную ноду
        let token = tokens[current] // Текущий токен
        if(token.type === 'number') { // Тип токена - числовой, возвращает ноду без детей - листок
            current++ // Перейти к следующему токену
            return {
                type: 'NumberLiteral',
                value: token.value
            }
        }
        if(token.type === 'string') { // Тип токена - строковый, возвращает ноду без детей - листок
            current++ // перейти к следующему
            return {
                type: 'StringLiteral',
                value: token.value
            }
        }
        if(token.type === 'parent' && token.value === '(') { // Тип токена - вложенность, возвращает ноду, имеющую дочерние элементы
            token = tokens[++current] // Следующий токен
            if(!token || token.type !== 'name') throw new Error('parent parsing error') // Если его нет или тип токена не литерал - ошибка
            let node = { // Нода с потомками
                type: 'CallExpression',
                name: token.value, // Имя ноды
                params: []
            }
            token = tokens[++current] // Следующий токен
            if(!token) throw new Error('parent parsing error') // Если его нет - ошибка
            while(token.type !== 'parent' || (token.type === 'parent' && token.value !== ')')) { // Пока не будет найден токен ")" добавлять следующие ноды к детям текущего токена
                node.params.push(walk()) // Добавить ребенка и перейти к следующему токену
                token = tokens[current] // Установить текущий токен
            }
            current++ // Перейти к следующему токену
            return node // Вернуть сформированную ноду
        }
        throw new Error('[PARSER] Parsing error, unknow token type: ' + token.type) // Если тип ноды неизвестен - ошибка
    }

    const ast = { // Коренной объект синтаксического дерева
        type: 'Program',
        params: [] // Вложенные объекты - ветки, листья
    }

    while(current < tokens.length) { // Проход токенов, формирование веток и листов дерева
        ast.params.push(walk()) // Добавить ребенка и перейти к следующей ноде
    }

    return ast // Вренуть сформированное дерево
}

// TRANSFORMER
// Модифицирует AST
// Обрабатывает ноды и на их основе строит новое дерево, по заданным правилам
// Данная функция как и функция GENERATOR работают с готовыми AST, модифицируют его, генерируют код по определенным правилам, но могут как и отсутсвовать так и выполнять другие задачи
// Например: непосредственно производить вычисления
const transformer = (node, parentt) => {
    const transformArray = (nodes, parentt) => nodes.map((node) => transformer(node, parentt))
    switch (node.type) {
      case 'Program': // Преобразование {type: 'Program', params[]}  ->  {type: 'Program', body: []}
        return {
            type: 'Program',
            body: transformArray(node.params, node) // Преобразовать всех потомков
        }
      case 'CallExpression': // Определение функции
        let expression = {
            type: 'CallExpression',
            callee: {
                type: 'Identifier',
                name: node.name // Имя текущей ноды
            },
            arguments: transformArray(node.params, node) // Аргументы функции
        }
        if(parentt.type !== 'CallExpression') { // Если есть дочерние ноды - функции - обернуть в отдельный объект
            return {
                type: 'ExpressionStatement',
                expression: expression
            }
        }
        return expression
      case 'NumberLiteral': // Числовые и строковые ноды - не модифицируются
        return {
            type: 'NumberLiteral',
            value: node.value
        }
      case 'StringLiteral':
        return {
            type: 'StringLiteral',
            value: node.value
        }
      default:
        throw new Error('[TRANSFORMER] Unknow node type: ' + node.type) // Неизвестный тип ноды - ошибка
    }
}

// GENERATOR
// Генерирует код на основе AST
// Данная реализация генерирует примерно следующий код: (add 1 2) => add (1, 2);
const generator = (node) => {
    switch (node.type) {
      case 'Program':
        return node.body.map(generator).join('\n')
      case 'ExpressionStatement':
        return generator(node.expression) + ';'
      case 'CallExpression':
        return generator(node.callee) + '(' + node.arguments.map(generator).join(', ') + ')'
      case 'Identifier':
        return node.name
      case 'NumberLiteral':
        return node.value
      case 'StringLiteral':
        return '"' + node.value + '"'
      default:
        throw new Error('[GENERATOR] Unknow node type: ' + node.type)
    }
}

// COMPILER
// Получает строку входных данных, разбивает её на токены, строит AST, модифицирует его и генерирует на основе AST код
// Пример: (add 1 (multiply 2 2)) => add(1, multiply(2, 2));
const compiler = (input) => {
    const tokens = tokenizer(input) // Разбить на токены
    const ast = parser(tokens) // Построить AST
    const extendAst = transformer(ast) // Преобразовать AST
    return generator(extendAst) // Сгенерировать код
}

// Пример использования
const input = '(add (multiply 1 2) (subtraction 3 (division 4 (sqrt 5))))'
const output = compiler(input)

console.log('[INPUT] ' + input)
console.log('[OUTPUT] ' + output)
