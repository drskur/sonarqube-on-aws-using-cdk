import { App } from 'aws-cdk-lib';
import { SonarQubeStack } from './sonar-qube-stack';

const app = new App();

new SonarQubeStack(app, 'sonarqube-on-aws-using-cdk');

app.synth();