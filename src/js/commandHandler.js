import { AllCommands, GenericOptions } from './commands';
import { arrHas } from './helpers';

export const processCommand = function(input) {
    if(input == '')
        return '';
    let parts = input.split(' ');
    const commandName = parts[0];
    const command = AllCommands[commandName];
    const options = [];
    const args = [];

    if(command === undefined) {
        throw new Error('-bash: '+commandName+': command not found');
    }

    parts = parts.splice(1);
    // parse options and arguments
    for(let i = 0; i < parts.length; i++) {
        let part = parts[i];
        if(part.indexOf('--') == 0 || part.indexOf('-') == 0) {
            // get rid of the leading dashes
            part = part.indexOf('--') == 0 ? part.slice(2) : part.slice(1);
            // make sure option is possible
            if(!arrHas(command.possibleOptions, part) && !arrHas(GenericOptions, part)) {
                throw new Error(commandName + ' - Unknown option: '+part);
            }
            options.push(part);
        }
        else {
            args.push(part);
        }
    }

    console.log("ops=",options);
    console.log("args=",args);

    if(arrHas(options, 'h') || arrHas(options, 'help')) {
        return '-- Help entry for: ' + commandName + ' -- \n' + command.helpText;
    }
    else {
        let commandResult = command.execute(options, args, input);
        return commandResult ? commandResult : '';
    }
};