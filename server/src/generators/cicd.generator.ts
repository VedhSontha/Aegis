export interface CiCdOptions {
  platform: 'github' | 'gitlab';
  targetName: string;
  aegisApiUrl: string;
}

export function generateCiCdConfig(options: CiCdOptions): string {
  const { platform, targetName, aegisApiUrl } = options;

  if (platform === 'github') {
    return `# .github/workflows/aegis.yml
name: AEGIS Security Gate
on: [pull_request, push]

jobs:
  aegis-scan:
    name: Run AEGIS Security Audit
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Trigger AEGIS Scan
        id: aegis_audit
        run: |
          echo "Initiating scan on target: ${targetName}"
          # Trigger scan and get the calculated grade
          RESPONSE=$(curl -s -X POST "${aegisApiUrl}/scan" \\
            -H 'Content-Type: application/json' \\
            -d '{"target":"${targetName}"}')
          
          SCAN_ID=$(echo $RESPONSE | jq -r '.scanId')
          echo "Scan initiated. Scan ID: $SCAN_ID"

          # Wait for scan processing to finish by polling status
          echo "Waiting for scan to complete..."
          ATTEMPT=0
          MAX_ATTEMPTS=30
          while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
            GRADE_INFO=$(curl -s "${aegisApiUrl}/scan/$SCAN_ID")
            STATUS=$(echo $GRADE_INFO | jq -r '.scan.status')
            echo "Current status: $STATUS"
            if [ "$STATUS" = "complete" ] || [ "$STATUS" = "error" ]; then
              break
            fi
            sleep 2
            ATTEMPT=$((ATTEMPT + 1))
          done
          GRADE=$(echo $GRADE_INFO | jq -r '.scan.grade')
          SCORE=$(echo $GRADE_INFO | jq -r '.scan.score')
          
          echo "AEGIS Score: $SCORE | Grade: $GRADE"
          
          if [[ "$GRADE" =~ ^(D|F)$ ]]; then
            echo "::error::AEGIS Security Gate failed! Grade $GRADE ($SCORE/100) is below threshold (C)."
            exit 1
          else
            echo "AEGIS Security Gate passed successfully!"
          fi
`;
  } else {
    // GitLab CI
    return `# .gitlab-ci.yml
stages:
  - security

aegis_security_scan:
  stage: security
  image: alpine:latest
  before_script:
    - apk add --no-cache curl jq
  script:
    - echo "Triggering security audit for target: ${targetName}"
    - |
      RESPONSE=$(curl -s -X POST "${aegisApiUrl}/scan" \\
        -H "Content-Type: application/json" \\
        -d "{\\"target\\":\\"${targetName}\\"}")
      SCAN_ID=$(echo $RESPONSE | jq -r '.scanId')
      echo "Scan started. Scan ID: $SCAN_ID"
      echo "Waiting for scan to complete..."
      ATTEMPT=0
      MAX_ATTEMPTS=30
      while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
        GRADE_INFO=$(curl -s "${aegisApiUrl}/scan/$SCAN_ID")
        STATUS=$(echo $GRADE_INFO | jq -r '.scan.status')
        echo "Current status: $STATUS"
        if [ "$STATUS" = "complete" ] || [ "$STATUS" = "error" ]; then
          break
        fi
        sleep 2
        ATTEMPT=$((ATTEMPT + 1))
      done
      GRADE=$(echo $GRADE_INFO | jq -r '.scan.grade')
      SCORE=$(echo $GRADE_INFO | jq -r '.scan.score')
      echo "AEGIS Security Rating - Score: $SCORE | Grade: $GRADE"
      if [[ "$GRADE" =~ ^(D|F)$ ]]; then
        echo "AEGIS Gate Failed: Grade is below security compliance threshold."
        exit 1
      fi
  only:
    - merge_requests
    - main
`;
  }
}
