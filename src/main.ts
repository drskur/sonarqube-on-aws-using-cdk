import { App } from 'aws-cdk-lib';
import { SonarQubeStack } from './sonar-qube-stack';

const app = new App();

new SonarQubeStack(app, 'sonarqube-on-aws-using-cdk', {
  cpu: 1024,
  memoryMiB: 2048,
  imageTag: 'community',
});

app.synth();