# Infrastructure (Terraform)

This directory contains Terraform configuration to provision the AWS infrastructure for VS Recorder.

## What is Terraform?

Terraform is an "Infrastructure as Code" tool that lets you define cloud resources in configuration files. Instead of clicking through the AWS Console, you describe what you want and Terraform creates it for you. Benefits:
- **Reproducible**: Run the same config to recreate your infrastructure
- **Version controlled**: Track infrastructure changes in git
- **Documentated**: The `.tf` files serve as documentation of your setup

## Prerequisites

1. **Install Terraform**: https://developer.hashicorp.com/terraform/downloads
   ```bash
   # macOS with Homebrew
   brew install terraform

   # Verify installation
   terraform --version
   ```

2. **Install AWS CLI**: https://aws.amazon.com/cli/
   ```bash
   # macOS with Homebrew
   brew install awscli

   # Verify installation
   aws --version
   ```

3. **Configure AWS credentials**:
   ```bash
   aws configure
   # Enter your AWS Access Key ID
   # Enter your AWS Secret Access Key
   # Enter your default region (e.g., us-east-1)
   # Enter output format (json)
   ```

4. **Create an EC2 Key Pair** (for SSH access):
   - Go to AWS Console → EC2 → Key Pairs
   - Click "Create key pair"
   - Name it (e.g., `vsrecorder-key`)
   - Download the `.pem` file and keep it safe
   - Run: `chmod 400 vsrecorder-key.pem`

## Files Overview

| File | Purpose |
|------|---------|
| `main.tf` | Provider configuration (AWS) and data sources |
| `variables.tf` | Input variables (things you can customize) |
| `vpc.tf` | Virtual Private Cloud, subnets, routing |
| `ec2.tf` | EC2 instance, security group, Elastic IP |
| `rds.tf` | PostgreSQL database |
| `ecr.tf` | Container image repositories |
| `route53.tf` | DNS records |
| `outputs.tf` | Values displayed after `terraform apply` |
| `terraform.tfvars.example` | Example variable values (copy and customize) |

## Quick Start

### Step 1: Configure Variables

```bash
cd infra

# Copy the example file
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
nano terraform.tfvars  # or use your preferred editor
```

**Required values to set:**
```hcl
ec2_key_name     = "vsrecorder-key"        # Name of your EC2 key pair
allowed_ssh_cidr = "YOUR_IP/32"            # Your IP for SSH (find at whatismyip.com)
db_password      = "YourSecurePassword123!" # Strong password for database
```

### Step 2: Initialize Terraform

This downloads the AWS provider plugin:
```bash
terraform init
```

You should see: `Terraform has been successfully initialized!`

### Step 3: Preview Changes

See what Terraform will create (without actually creating it):
```bash
terraform plan
```

Review the output. You should see resources to be created:
- 1 VPC
- 4 Subnets (2 public, 2 private)
- 1 Internet Gateway
- 1 EC2 Instance
- 1 RDS Instance
- 2 ECR Repositories
- Security Groups
- Route 53 DNS records

### Step 4: Apply Changes

Create the infrastructure:
```bash
terraform apply
```

Type `yes` when prompted. This takes 5-10 minutes (RDS is slow to create).

### Step 5: Note the Outputs

After completion, Terraform displays important values:
```
Outputs:

ec2_public_ip = "12.34.56.78"
rds_endpoint = "vsrecorder-db.xxxxx.us-east-1.rds.amazonaws.com:5432"
ecr_backend_url = "123456789.dkr.ecr.us-east-1.amazonaws.com/vsrecorder-backend"
ecr_frontend_url = "123456789.dkr.ecr.us-east-1.amazonaws.com/vsrecorder-frontend"
route53_nameservers = ["ns-xxx.awsdns-xx.com", ...]
ssh_command = "ssh -i <your-key>.pem ec2-user@12.34.56.78"
```

**Save these!** You'll need them for:
- GitHub Secrets (EC2 IP, ECR URLs)
- Domain configuration (Route 53 nameservers)
- Backend configuration (RDS endpoint)

## After Terraform Apply

### 1. Update Domain Nameservers

If your domain is registered elsewhere (e.g., Cloudflare, GoDaddy):
1. Copy the `route53_nameservers` output
2. Go to your domain registrar
3. Replace the nameservers with the Route 53 ones
4. Wait for DNS propagation (can take up to 48 hours, usually faster)

### 2. SSH into EC2

```bash
ssh -i /path/to/vsrecorder-key.pem ec2-user@<ec2_public_ip>
```

### 3. Configure GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets → Actions):

| Secret | Value |
|--------|-------|
| `AWS_ACCESS_KEY_ID` | Your AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret key |
| `AWS_REGION` | `us-east-1` (or your region) |
| `AWS_ACCOUNT_ID` | Your 12-digit AWS account ID |
| `EC2_HOST` | The `ec2_public_ip` output |
| `EC2_SSH_KEY` | Contents of your `.pem` file |

### 4. Set Up SSL Certificates

SSH into EC2 and run:
```bash
sudo certbot certonly --standalone \
  -d vsrecorder.app \
  -d api.vsrecorder.app \
  -d beta.vsrecorder.app \
  --email your@email.com \
  --agree-tos
```

### 5. Deploy the Application

Copy docker-compose and nginx files to EC2:
```bash
scp -i vsrecorder-key.pem docker-compose.prod.yml ec2-user@<EC2_IP>:/opt/vsrecorder/
scp -i vsrecorder-key.pem -r nginx/ ec2-user@<EC2_IP>:/opt/vsrecorder/
```

Create a `.env` file on EC2:
```bash
ssh -i vsrecorder-key.pem ec2-user@<EC2_IP>
cd /opt/vsrecorder

cat > .env << EOF
AWS_ACCOUNT_ID=123456789012
AWS_REGION=us-east-1
DATABASE_URL=jdbc:postgresql://<rds_endpoint>/vsrecorder
DB_USERNAME=vsrecorder_admin
DB_PASSWORD=<your_db_password>
JWT_SECRET=<generate-a-long-random-string>
EOF
```

## Common Commands

```bash
# See current state
terraform show

# See outputs again
terraform output

# See specific output
terraform output ec2_public_ip

# Destroy everything (careful!)
terraform destroy

# Format configuration files
terraform fmt

# Validate configuration
terraform validate
```

## Cost Breakdown

Estimated monthly cost (~$32/month):
| Resource | Cost |
|----------|------|
| EC2 t3.small | ~$15/month |
| RDS db.t3.micro | ~$13/month (free tier eligible) |
| EBS 30GB gp3 | ~$2.50/month |
| Route 53 | ~$0.50/month |
| ECR | ~$1/month |
| Elastic IP | Free (when attached) |

## Modifying Infrastructure

To change something:
1. Edit the `.tf` files
2. Run `terraform plan` to preview changes
3. Run `terraform apply` to apply changes

**Example: Change EC2 instance type**
```hcl
# In terraform.tfvars
ec2_instance_type = "t3.medium"  # was t3.small
```
Then: `terraform apply`

## Destroying Infrastructure

To tear everything down (stops all costs):
```bash
terraform destroy
```

Type `yes` when prompted. This will:
- Terminate the EC2 instance
- Delete the RDS database (data will be lost!)
- Delete ECR repositories (images will be lost!)
- Remove DNS records
- Delete the VPC and all networking

## Troubleshooting

**"Error: No valid credential sources found"**
```bash
aws configure  # Re-run and enter credentials
```

**"Error: creating EC2 Instance: UnauthorizedOperation"**
- Your AWS user needs EC2, RDS, ECR, VPC, Route53 permissions
- Easiest: Attach `AdministratorAccess` policy (for personal projects)

**"Error: Error creating DB Instance: DBSubnetGroupNotFoundFault"**
- The VPC/subnets weren't created properly
- Run `terraform destroy` then `terraform apply` again

**State file issues**
```bash
# If state gets corrupted, you may need to import existing resources
# or delete them manually in AWS Console, then re-run terraform apply
```

## Advanced: Remote State

For team collaboration, store Terraform state in S3:

1. Create an S3 bucket: `vsrecorder-terraform-state`
2. Create a DynamoDB table: `vsrecorder-terraform-locks`
3. Uncomment the backend block in `main.tf`
4. Run `terraform init` (it will ask to migrate state)
