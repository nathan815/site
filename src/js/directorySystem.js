import { $terminalTitle } from './elements';
import { openResume } from './resumeViewer';

export const DirectoryList = {
    '~': {
        items: [ 'about', 'projects', 'resume', 'contact '],
        about: {
            contents: '#about'
        },
        projects: {
            items: [ 'EnemyClouds', 'StudentSignIn', 'TheSwanStation', 'FishNet', 'EcoSPAN' ],
            EnemyClouds: {
                items: [ 'hi' ],
                hi: {
                    items: [ 'hello' , 'world']
                }
            }
        },
        resume: {
            execute: openResume
        },
        contact: {
            contents: '#contact'
        }
    }
};

export let Directory = {};
Directory.current = '~';
Directory.currentDirObject = DirectoryList[Directory.current];
Directory.prev = '';
Directory.prevDirObject = null;

Directory.setCurrentDirectory = function(path, dirObject) {
    if(path.indexOf(Directory.current) < 0 && path.indexOf('~') != 0) {
        path = Directory.current + '/' + path;
    }
    Directory.prev = Directory.current;
    Directory.prevDirObject = Directory.currentDirObject;
    Directory.current = path;
    Directory.currentDirObject = dirObject || Directory.parseDir(path);
    $terminalTitle.html('bash ' + path);
};

Directory.goBack = function() {
    Directory.setCurrentDirectory(Directory.prev, Directory.prevDirObject);
}
Directory.parseDir = function(path) {
    let parts = path.split('/');
    let dir = DirectoryList;
    if(parts[0] != '~')
        dir = Directory.currentDirObject;

    // loop through each part of directory
    for(let i = 0; i < parts.length; i++) {
        let part = parts[i];
        if(part.trim() == '' || part == '.') 
            continue;
        if(dir[part] == undefined)
            throw new Error(path+': No such file or directory');
        dir = dir[part];
    }
    return dir;
}

Directory.generateContents = function(path) {
    let output = '';
    let dir = Directory.parseDir(path);

    // loop through the items in the directory
    if(!dir.items)
        throw new Error(path + ': No such directory');
    for(let i = 0; i < dir.items.length; i++) {
        output += dir.items[i];
        if(i % 2 && i != 0 && i != dir.items.length-1) 
            output += '\n';
        else
            output += '\t\t';
    }
    return output;
}