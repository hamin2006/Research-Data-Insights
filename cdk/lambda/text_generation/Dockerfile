FROM public.ecr.aws/lambda/python:3.11

# Install system dependencies for psycopg[binary] and build tools for numpy
# NOTE: If you don't actually need psycopg/numpy, you can remove this block to shrink the image.
RUN yum -y install postgresql-devel gcc libpq gcc-c++ \
    && yum clean all \
    && rm -rf /var/cache/yum

# Set working directory
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy the requirements.txt file
COPY requirements.txt ${LAMBDA_TASK_ROOT}

# Install Python packages
RUN pip install --no-cache-dir -r requirements.txt

RUN pip list

# Copy source code
COPY src/ ${LAMBDA_TASK_ROOT}

# Set Lambda handler
CMD [ "main.handler" ]
