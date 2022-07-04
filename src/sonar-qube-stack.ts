import { Stack, StackProps } from 'aws-cdk-lib';
import { Peer, Port, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Cluster, Compatibility, ContainerImage, LogDriver, Secret, TaskDefinition, UlimitName } from 'aws-cdk-lib/aws-ecs';
import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';
import { AuroraPostgresEngineVersion, Credentials, DatabaseClusterEngine, ServerlessCluster } from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';

export interface SonarQubeStackProp extends StackProps {
  /**
   * The number of cpu units used by the task.
   *
   * 256 (.25 vCPU) - Available memory values: 512 (0.5 GB), 1024 (1 GB), 2048 (2 GB)
   * 512 (.5 vCPU) - Available memory values: 1024 (1 GB), 2048 (2 GB), 3072 (3 GB), 4096 (4 GB)
   * 1024 (1 vCPU) - Available memory values: 2048 (2 GB), 3072 (3 GB), 4096 (4 GB), 5120 (5 GB), 6144 (6 GB), 7168 (7 GB), 8192 (8 GB)
   * 2048 (2 vCPU) - Available memory values: Between 4096 (4 GB) and 16384 (16 GB) in increments of 1024 (1 GB)
   * 4096 (4 vCPU) - Available memory values: Between 8192 (8 GB) and 30720 (30 GB) in increments of 1024 (1 GB)
   *
   * @default 1024
   */
  cpu?: number;
  /**
   * The amount (in MiB) of memory used by the task.
   *
   * @default 2048
   */
  memoryMiB?: number;
  /**
   * The tag name of sonarqube
   *
   * @default community
   */
  imageTag?: string;
}

export class SonarQubeStack extends Stack {
  constructor(scope: Construct, id: string, props: SonarQubeStackProp = { }) {
    super(scope, id, props);

    let { cpu, memoryMiB, imageTag } = props;
    cpu = cpu ?? 1024;
    memoryMiB = memoryMiB ?? 2048;
    imageTag = imageTag ?? 'community';

    const defaultDatabaseName = 'sonarqube';

    const vpc = new Vpc(this, 'vpc');
    const cluster = new Cluster(this, 'cluster', {
      vpc,
    });

    const sg = new SecurityGroup(this, 'sonarqube-sg', {
      vpc,
      allowAllOutbound: true,
      description: 'Aurora Security Group',
    });
    sg.addIngressRule(Peer.anyIpv4(), Port.tcp(5432), 'SonarDBAurora');

    const aurora = new ServerlessCluster(this, 'aurora-cluster', {
      vpc,
      engine: DatabaseClusterEngine.auroraPostgres({
        version: AuroraPostgresEngineVersion.VER_10_18,
      }),
      credentials: Credentials.fromGeneratedSecret('postgres'),
      defaultDatabaseName: defaultDatabaseName,
      securityGroups: [sg],
    });

    const taskDefinition = new TaskDefinition(this, 'sonarqube-task', {
      compatibility: Compatibility.EC2_AND_FARGATE,
      cpu: `${cpu}`,
      memoryMiB: `${memoryMiB}`,
    });
    taskDefinition.addContainer('sonarqube', {
      image: ContainerImage.fromRegistry(`public.ecr.aws/docker/library/sonarqube:${imageTag}`),
      memoryLimitMiB: memoryMiB,
      command: ['-Dsonar.search.javaAdditionalOpts=-Dnode.store.allow_mmap=false'],
      logging: LogDriver.awsLogs({
        streamPrefix: 'sonarqube',
      }),
      portMappings: [
        {
          containerPort: 9000,
        },
      ],
      secrets: {
        'sonar.jdbc.password': Secret.fromSecretsManager(aurora.secret!, 'password'),
        'sonar.jdbc.username': Secret.fromSecretsManager(aurora.secret!, 'username'),
      },
      environment: {
        'sonar.jdbc.url': `jdbc:postgresql://${aurora.clusterEndpoint.socketAddress}/${defaultDatabaseName}`,
      },
    });
    taskDefinition.defaultContainer?.addUlimits(
      {
        name: UlimitName.NOFILE,
        softLimit: 65536,
        hardLimit: 65536,
      },
    );

    new ApplicationLoadBalancedFargateService(this, 'alb-fargate-service', {
      cluster,
      taskDefinition,
      publicLoadBalancer: true,
      desiredCount: 1,
    });

  }
}