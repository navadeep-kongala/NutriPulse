pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  environment {
    TAG = "${env.BUILD_NUMBER}"
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Test Backend') {
      // the Dockerfile's "test" stage runs node --test; build fails if tests fail
      steps { sh 'docker build --target test -t nutripulse-backend-test backend' }
    }

    stage('Build Images') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'dockerhub-creds',
                         usernameVariable: 'DH_USER', passwordVariable: 'DH_PASS')]) {
          sh '''
            docker build -t $DH_USER/nutripulse-backend:$TAG  -t $DH_USER/nutripulse-backend:latest  backend
            docker build -t $DH_USER/nutripulse-frontend:$TAG -t $DH_USER/nutripulse-frontend:latest frontend
          '''
        }
      }
    }

    stage('Push Images') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'dockerhub-creds',
                         usernameVariable: 'DH_USER', passwordVariable: 'DH_PASS')]) {
          sh '''
            echo "$DH_PASS" | docker login -u "$DH_USER" --password-stdin
            docker push $DH_USER/nutripulse-backend:$TAG
            docker push $DH_USER/nutripulse-backend:latest
            docker push $DH_USER/nutripulse-frontend:$TAG
            docker push $DH_USER/nutripulse-frontend:latest
          '''
        }
      }
    }

    stage('Deploy to Kubernetes') {
      steps {
        withCredentials([
          file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG'),
          usernamePassword(credentialsId: 'dockerhub-creds',
                           usernameVariable: 'DH_USER', passwordVariable: 'DH_PASS')
        ]) {
          sh '''
            # fill in the Docker Hub username and this build's tag, then apply
            mkdir -p rendered
            for f in k8s/backend.yaml k8s/frontend.yaml; do
              sed -e "s|DOCKERHUB_USER|$DH_USER|g" \
                  -e "s|\\(nutripulse-[a-z]*\\):latest|\\1:$TAG|g" $f > rendered/$(basename $f)
            done
            kubectl apply -f rendered/
            kubectl rollout status deployment/nutripulse-backend  --timeout=180s
            kubectl rollout status deployment/nutripulse-frontend --timeout=180s
          '''
        }
      }
    }
  }

  post {
    success { echo 'Deployed: http://localhost:30080' }
    failure { echo 'Pipeline failed, check the logs above.' }
    always  { sh 'docker logout || true' }
  }
}
