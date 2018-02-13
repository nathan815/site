import { $terminalTitle } from './elements';
import { openResume } from './resumeViewer';

export const DirectoryList = {
    '~': {
        items: [ 'about', 'projects', 'resume', 'contact', 'site-info'],
        about: {
            contents: '#about'
        },
        projects: {
            items: [ 'EnemyClouds', 'StudentSignIn', 'SwanStation', 'FishNet', 'EcoSpan' ],
            enemyclouds: {
                contents: '#project-enemy-clouds'
            },
            studentsignin: {
                contents: '#project-student-signin'
            },
            swanstation: {
                contents: '#project-swan-station'
            },
            fishnet: {
                contents: '#project-fishnet'
            },
            ecospan: {
                contents: '#project-ecospan'
            }
        },
        resume: {
            execute: openResume
        },
        contact: {
            contents: '#contact'
        },
        ['site-info']: {
            contents: '#site-info'
        },
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
    $terminalTitle.html(path);
};

Directory.goBack = function() {
    Directory.setCurrentDirectory(Directory.prev, Directory.prevDirObject);
};

Directory.parseDir = function(path) {
    let parts = path.split('/');
    let dir = DirectoryList;
    if(parts[0] != '~')
        dir = Directory.currentDirObject;

    // loop through each part of directory
    for(let i = 0; i < parts.length; i++) {
        let part = parts[i].trim().toLowerCase();
        if(part == '' || part == '.') 
            continue;
        if(dir[part] == undefined)
            throw new Error(path+': No such file or directory');
        dir = dir[part];
    }
    return dir;
};

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
};