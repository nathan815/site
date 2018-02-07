import { arrHas } from './helpers';

const lsCommand = function(options, args, input) {
    if(options[0] == 'a') {
        return 'All';
    }
    return 'Listing...';
}

const gitCommand = function(options, args, input) {
    if(arrHas(args, 'init'))
        return 'fatal: unable to initialize git repository (permission denied)';
    return 'fatal: Not a git repository (or any of the parent directories): .git';
}

export const AllCommands = {
    ls: {
        execute: lsCommand,
        possibleOptions: [ 'a' ],
        helpText: 'Lists files'
    },
    git: {
        execute: gitCommand,
        possibleOptions: [],
        helpText: 'The best source control system!'
    }
};

export const GenericOptions = [ 'h', 'help' ];