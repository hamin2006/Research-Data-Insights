FROM public.ecr.aws/lambda/python:3.11

# Install build dependencies
RUN yum -y install postgresql-devel gcc libpq gcc-c++ make yasm pkgconfig git \
    && yum clean all \
    && rm -rf /var/cache/yum

# Build FFmpeg from source
RUN cd /tmp && \
    git clone https://github.com/FFmpeg/FFmpeg.git && \
    cd FFmpeg && \
    ./configure --prefix=/usr/local --enable-shared --disable-static && \
    make -j$(nproc) && \
    make install && \
    ldconfig && \
    rm -rf /tmp/FFmpeg

# Set working directory
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy the requirements.txt file
COPY requirements.txt ${LAMBDA_TASK_ROOT}

# Install Python packages
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ ${LAMBDA_TASK_ROOT}

# Verify FFmpeg installation
RUN ffmpeg -version

# Set Lambda handler
CMD [ "main.handler" ]