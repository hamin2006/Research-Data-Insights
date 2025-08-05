# User Guide

**Please ensure the application is deployed, instructions in the deployment guide here:**
- [Deployment Guide](./deploymentGuide.md)

Once you have deployed the solution, the following user guide will help you navigate the functions available.

| Index    | Description |
| -------- | ------- |
| [Administrator View](#admin-view)  |The administrator can register researchers, and handle the overall AI settings. | 
| [Researcher View](#researcher-view)  | The researcher can start an agenda, add . |
| [Member View](#member-view)  | The student can start a case, interact with AI Assistant, create summaries and transcribe audio interviews. |

All users start by filling their information at the sign up page.  
![image](./media/create-account.png)

You then get a confirmation email to verify your email and are registered as a user. 

## Administrator View
Once you have an account, to become an adminstrator, you need to change your user group with Cognito through the AWS Console:
<!-- ![image](./media/user-pool.png) -->

After clicking the user pool of the project, navigate to "Users" on the left navigation bar and find your email:
![image](./media/users.png)

After clicking your email, you can add the 'admin' user group. Start by scrolling down to "Group memberships" and selecting "Add user to group".  
Select the "admin" group from available options. And lastly, confirm that the user has been added to the admin group by checking the "group attributes" of the user:

<p>
  <img src="./media/add-user-group.png" width="45%" style="display:inline-block; margin-right:10px;" />
  <img src="./media/select-admin.png" width="45%" style="display:inline-block;" />
</p>

![image](./media/admin-added.png)


Once the 'admin' user group is added, delete the 'member' user group:

<!-- <p>
  <img src="./media/delete-member.png" width="45%" style="display:inline-block; margin-right:10px;" />
  <img src="./media/admin-only.png" width="45%" style="display:inline-block;" />
</p> -->


Upon logging in as an administrator, they see the following home page:
![image](./media/admin-home-page.png)

Clicking the "ADD RESERACHER" button opens a pop-up where the administrator can enter the email address of a user with an account to add them as an instructor:
<!-- ![image](./media/admin-add-instructor.png) -->

In the "AI Settings" page, the administrator can set a daily message limit for each user which will alter how many times a user can send messages to the AI Assistant:
![image](./media/admin-message-limit.png)


## Researcher View

Upon logging in as an researcher, you’re greeted with a homepage that displays all your recent agendas.

![image](./media/researcher-home-page.png)

The researcher can start a new agenda by clicking on the "New Agenda" button. 

![image](./media/researcher-new-agenda.png)

From here, the researcher can input all information related to the agenda including the Title, the metric name and description (Which outlines how the LLM will score responses), the context documents to give the LLM more information about the scoring and response groups for scoring. 

Once submitted, the researcher can interact to get more insights from the LLM. 

On the "Collaborators" tab, the researcher can add members to the research agenda as collaborators.

![image](./media/researcher-add-collaborators.png)

The researcher can add more information and documents using the "Context Documents" and "Response Groups" tabs when 

![image](./media/researcher-add-responses.png)
![image](./media/researcher-add-context-docs.png)